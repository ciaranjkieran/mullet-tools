from django.db import migrations


def create_subscriptions_for_existing_users(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Subscription = apps.get_model("billing", "Subscription")
    existing_user_ids = set(
        Subscription.objects.values_list("user_id", flat=True)
    )
    to_create = []
    for user in User.objects.all():
        if user.id not in existing_user_ids:
            to_create.append(
                Subscription(
                    user_id=user.id,
                    status="active",
                )
            )
    if to_create:
        Subscription.objects.bulk_create(to_create)


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(
            create_subscriptions_for_existing_users,
            migrations.RunPython.noop,
        ),
    ]
