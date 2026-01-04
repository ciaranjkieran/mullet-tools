# validators.py
from rest_framework import serializers

def validate_at_most_one(data, fields, *, entity_name="entity"):
    set_fields = [f for f in fields if data.get(f) is not None]
    if len(set_fields) > 1:
        raise serializers.ValidationError({
            "__all__": f"{entity_name}: at most one of {fields} may be set."
        })
    return set_fields[0] if set_fields else None

def validate_mode_matches_ancestor(data, ancestor_field, *, entity_name="entity"):
    if not ancestor_field:
        return
    ancestor = data.get(ancestor_field)
    mode = data.get("mode")
    if ancestor is not None and mode is not None and ancestor.mode_id != mode.id:
        raise serializers.ValidationError({
            "mode": f"{entity_name}: mode must match the selected {ancestor_field}'s mode."
        })
