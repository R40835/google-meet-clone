from django.db import models
from django.contrib.auth.models import BaseUserManager, AbstractBaseUser
from django.core.exceptions import ValidationError
from PIL import Image


class MyUserManager(BaseUserManager):
    def create_user(self, email, date_of_birth, password=None, **kwargs):
        """
        Creates and saves a User with the given email, date of
        birth and password.
        """
        if not email:
            raise ValueError("Users must have an email address")

        user = self.model(
            email=self.normalize_email(email),
            date_of_birth=date_of_birth,
            **kwargs
        )

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, date_of_birth, password=None, **kwargs):
        """
        Creates and saves a superuser with the given email, date of
        birth and password.
        """
        user = self.create_user(
            email,
            password=password,
            date_of_birth=date_of_birth,
            **kwargs
        )
        user.is_admin = True
        user.save(using=self._db)
        return user


class User(AbstractBaseUser):
    username        = models.CharField(max_length=20, unique=True, blank=False)
    first_name      = models.CharField(max_length=20, unique=False, blank=False)
    last_name       = models.CharField(max_length=20, unique=False, blank=False)
    email           = models.EmailField(verbose_name="Email Address", max_length=255, unique=True)
    date_of_birth   = models.DateField(blank=False, unique=False)
    profile_photo   = models.ImageField(upload_to="profile_photos/", blank=True, null=True)

    is_active   = models.BooleanField(default=True)
    is_admin    = models.BooleanField(default=False)

    objects = MyUserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["first_name", "last_name", "email",  "date_of_birth"]

    def __str__(self):
        """
        String representation of the object.
        """
        return self.email

    def has_perm(self, perm, obj=None):
        "Does the user have a specific permission?"
        # Simplest possible answer: Yes, always
        return True

    def has_module_perms(self, app_label):
        "Does the user have permissions to view the app `app_label`?"
        # Simplest possible answer: Yes, always
        return True

    @property
    def is_staff(self):
        "Is the user a member of staff?"
        # Simplest possible answer: All admins are staff
        return self.is_admin
    
    def save(self, *args, **kwargs):
        """
        Override the save method to handle user profile photo resizing 
        and save them in DB.
        """
        super().save(*args, **kwargs) 

        if self.profile_photo:
            SIZE = (500, 500)

            image = Image.open(self.profile_photo.path)
            profile_photo = image.resize(SIZE)
            profile_photo.save(self.profile_photo.path)

    class Meta:
        db_table = "user"