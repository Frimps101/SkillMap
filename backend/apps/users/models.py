from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    current_role = models.CharField(max_length=120, blank=True)
    target_role = models.CharField(max_length=120, blank=True)
    known_skills = models.ManyToManyField(
        "skills.Skill", blank=True, related_name="users_with_skill"
    )

    class Meta:
        db_table = "user_profiles"

    def __str__(self):
        return f"Profile({self.user.email})"
