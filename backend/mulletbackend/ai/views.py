import json
import logging

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.http import StreamingHttpResponse
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from collaboration.permissions import writable_mode_ids
from core.models import Goal, Project, Milestone, Task, Mode
from comments.models import Comment

from core.services.ordering import (
    assign_end_position_for_goal,
    assign_end_position_for_project,
    assign_end_position_for_milestone,
    assign_end_position_for_task,
)
from .prompts import get_system_prompt

logger = logging.getLogger(__name__)

# Map entity type strings to Django models and their parent FK field names
ENTITY_MODELS = {
    "goal": Goal,
    "project": Project,
    "milestone": Milestone,
    "task": Task,
}

# Which FK field to set based on the parent's type
PARENT_FK_FIELDS = {
    ("project", "goal"): "goal_id",
    ("project", "project"): "parent_id",
    ("milestone", "goal"): "goal_id",
    ("milestone", "project"): "project_id",
    ("milestone", "milestone"): "parent_id",
    ("task", "goal"): "goal_id",
    ("task", "project"): "project_id",
    ("task", "milestone"): "milestone_id",
}


class AiBuildView(APIView):
    """
    POST /api/ai/build/
    Send a prompt to Claude and get back a structured entity tree.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        mode_id = request.data.get("modeId")
        history = request.data.get("history") or []
        entities = request.data.get("entities") or []

        if not prompt:
            return Response(
                {"error": "prompt is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not mode_id:
            return Response(
                {"error": "modeId is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate mode access
        if int(mode_id) not in writable_mode_ids(request.user):
            return Response(
                {"error": "You do not have write access to this mode."},
                status=status.HTTP_403_FORBIDDEN,
            )

        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if not api_key:
            return Response(
                {"error": "AI features are not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Build messages for Claude
        messages = []

        # Inject existing entity snapshot as context (if provided)
        if entities:
            entity_json = json.dumps(entities, default=str)
            messages.append(
                {"role": "user", "content": f"EXISTING ENTITIES IN THIS MODE:\n{entity_json}"}
            )
            messages.append(
                {"role": "assistant", "content": "Understood. I have the current entity snapshot and will reference it when needed."}
            )

        for entry in history:
            role = entry.get("role", "user")
            content = entry.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": prompt})

        import anthropic

        client = anthropic.Anthropic(api_key=api_key)

        def event_stream():
            try:
                with client.messages.stream(
                    model="claude-sonnet-4-6",
                    max_tokens=4096,
                    system=[{
                        "type": "text",
                        "text": get_system_prompt(),
                        "cache_control": {"type": "ephemeral"},
                    }],
                    messages=messages,
                ) as stream:
                    for text in stream.text_stream:
                        yield f"data: {json.dumps({'type': 'delta', 'text': text})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except Exception:
                logger.exception("AI build streaming failed")
                yield f"data: {json.dumps({'type': 'error', 'message': 'AI request failed. Please try again.'})}\n\n"

        response = StreamingHttpResponse(
            event_stream(),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class AiCommitView(APIView):
    """
    POST /api/ai/commit/
    Apply all operations from an approved AI-generated tree.
    Supports create, update, delete, and noop operations.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        mode_id = request.data.get("modeId")
        nodes = request.data.get("nodes")

        if not mode_id or not nodes:
            return Response(
                {"error": "modeId and nodes are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate mode access
        try:
            mode = Mode.objects.get(id=int(mode_id))
        except Mode.DoesNotExist:
            return Response(
                {"error": "Mode not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if mode.id not in writable_mode_ids(request.user):
            return Response(
                {"error": "You do not have write access to this mode."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Flatten tree into ordered list (parents before children)
        flat_nodes = []
        self._flatten(nodes, flat_nodes)

        # Separate by operation
        deletes = [n for n in flat_nodes if n.get("op") == "delete"]
        updates = [n for n in flat_nodes if n.get("op") == "update"]
        noops = [n for n in flat_nodes if n.get("op") == "noop"]
        creates = [n for n in flat_nodes if n.get("op", "create") == "create"]

        temp_id_map = {}  # tempId -> (real_id, entity_type)
        zero_counts = {"goals": 0, "projects": 0, "milestones": 0, "tasks": 0}
        counts = {
            "created": dict(zero_counts),
            "updated": dict(zero_counts),
            "deleted": dict(zero_counts),
        }

        try:
            with transaction.atomic():
                # --- DELETES first (avoids FK issues) ---
                for node in deletes:
                    entity_type = node.get("type")
                    entity_id = node.get("id")
                    if entity_type not in ENTITY_MODELS or not entity_id:
                        continue
                    Model = ENTITY_MODELS[entity_type]
                    try:
                        entity = Model.objects.get(
                            id=entity_id, mode=mode, user=request.user
                        )
                        entity.delete()
                        counts["deleted"][entity_type + "s"] += 1
                    except Model.DoesNotExist:
                        continue

                # --- UPDATES ---
                for node in updates:
                    entity_type = node.get("type")
                    entity_id = node.get("id")
                    if entity_type not in ENTITY_MODELS or not entity_id:
                        continue
                    Model = ENTITY_MODELS[entity_type]
                    try:
                        entity = Model.objects.get(
                            id=entity_id, mode=mode, user=request.user
                        )
                    except Model.DoesNotExist:
                        continue

                    title = (node.get("title") or "").strip()
                    if title:
                        entity.title = title
                    if "dueDate" in node:
                        entity.due_date = node["dueDate"] or None
                    if "description" in node and hasattr(Model, "description"):
                        entity.description = node["description"] or ""

                    entity.save()

                    temp_id = node.get("tempId")
                    if temp_id:
                        temp_id_map[temp_id] = (entity.id, entity_type)

                    counts["updated"][entity_type + "s"] += 1

                # --- NOOP: register in temp_id_map for parent resolution ---
                for node in noops:
                    temp_id = node.get("tempId")
                    entity_id = node.get("id")
                    entity_type = node.get("type")
                    if temp_id and entity_id:
                        temp_id_map[temp_id] = (entity_id, entity_type)

                # --- CREATES (existing logic) ---
                for node in creates:
                    entity_type = node.get("type")
                    title = (node.get("title") or "").strip()
                    temp_id = node.get("tempId")
                    parent_temp_id = node.get("parentTempId")
                    due_date = node.get("dueDate") or None
                    description = node.get("description") or ""
                    comment_text = node.get("comment") or ""

                    if entity_type not in ENTITY_MODELS or not title:
                        continue

                    Model = ENTITY_MODELS[entity_type]

                    create_kwargs = {
                        "title": title,
                        "user": request.user,
                        "mode": mode,
                        "is_completed": False,
                    }

                    if due_date:
                        create_kwargs["due_date"] = due_date

                    if description and hasattr(Model, "description"):
                        create_kwargs["description"] = description

                    # Set parent FK if applicable
                    if parent_temp_id and parent_temp_id in temp_id_map:
                        real_parent_id, parent_type = temp_id_map[parent_temp_id]
                        fk_field = PARENT_FK_FIELDS.get(
                            (entity_type, parent_type)
                        )
                        if fk_field:
                            create_kwargs[fk_field] = real_parent_id

                    # Assign position at end of container
                    pos_data = {"mode_id": mode.id, **{
                        k: create_kwargs[k]
                        for k in ("milestone_id", "project_id", "goal_id", "parent_id")
                        if k in create_kwargs
                    }}
                    assign_fn = {
                        "goal": assign_end_position_for_goal,
                        "project": assign_end_position_for_project,
                        "milestone": assign_end_position_for_milestone,
                        "task": assign_end_position_for_task,
                    }[entity_type]
                    create_kwargs["position"] = assign_fn(pos_data)

                    entity = Model.objects.create(**create_kwargs)
                    temp_id_map[temp_id] = (entity.id, entity_type)

                    counts["created"][entity_type + "s"] += 1

                    # Create explanation comment if provided
                    if comment_text:
                        ct = ContentType.objects.get_for_model(Model)
                        Comment.objects.create(
                            mode=mode,
                            user=request.user,
                            content_type=ct,
                            object_id=entity.id,
                            body=comment_text,
                        )

        except Exception:
            logger.exception("AI commit failed")
            return Response(
                {"error": "Failed to apply changes."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(counts, status=status.HTTP_200_OK)

    def _flatten(self, nodes, result):
        """Recursively flatten nested nodes into a list (parents first)."""
        for node in nodes:
            result.append(node)
            children = node.get("children") or []
            self._flatten(children, result)
