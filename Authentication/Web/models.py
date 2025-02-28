from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)  # Email as Username
    face_encoding = models.TextField(null=True, blank=True)  # Store face encoding as text

    USERNAME_FIELD = 'email'  # Use email instead of username for login
    REQUIRED_FIELDS = ['name']

    def __str__(self):
        return self.first_name+" "+self.last_name
