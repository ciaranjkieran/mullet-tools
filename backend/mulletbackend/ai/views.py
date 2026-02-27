import json
import logging

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from collaboration.permissions import writable_mode_ids
from core.models import Goal, Project, Milestone, Task, Mode
from comments.models import Comment

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
        for entry in history:
            role = entry.get("role", "user")
            content = entry.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": prompt})

        try:
            import anthropic

            client = anthropic.Anthropic(api_key=api_key)
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=4096,
                system=get_system_prompt(),
                messages=messages,
            )

            raw_text = response.content[0].text

            # Parse JSON from response (handle potential markdown wrapping)
            json_text = raw_text.strip()
            if json_text.startswith("```"):
                # Strip markdown code fences
                lines = json_text.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                json_text = "\n".join(lines)

            tree = json.loads(json_text)

            return Response(tree, status=status.HTTP_200_OK)

        except json.JSONDecodeError:
            logger.exception("Failed to parse AI response as JSON")
            return Response(
                {"error": "AI returned invalid JSON. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("AI build request failed")
            return Response(
                {"error": "AI request failed. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class AiCommitView(APIView):
    """
    POST /api/ai/commit/
    Create all entities from an approved AI-generated tree.
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

        temp_id_map = {}  # tempId -> real database ID
        counts = {"goals": 0, "projects": 0, "milestones": 0, "tasks": 0}

        try:
            with transaction.atomic():
                for node in flat_nodes:
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

                    entity = Model.objects.create(**create_kwargs)
                    temp_id_map[temp_id] = (entity.id, entity_type)

                    count_key = entity_type + "s"
                    counts[count_key] = counts.get(count_key, 0) + 1

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
                {"error": "Failed to create entities."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"created": counts}, status=status.HTTP_201_CREATED)

    def _flatten(self, nodes, result):
        """Recursively flatten nested nodes into a list (parents first)."""
        for node in nodes:
            result.append(node)
            children = node.get("children") or []
            self._flatten(children, result)
