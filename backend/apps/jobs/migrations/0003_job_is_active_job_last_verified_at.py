from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="is_active",
            field=models.BooleanField(default=True, db_index=True),
        ),
        migrations.AddField(
            model_name="job",
            name="last_verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
