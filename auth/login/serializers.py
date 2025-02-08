from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'date_of_birth', 'email','profile_photo', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            date_of_birth=validated_data['date_of_birth'],
            email=validated_data['email']
        )

        # optional profile_photo
        profile_photo = validated_data.get('profile_photo', None)
        if profile_photo:
            user.profile_photo = profile_photo

        user.set_password(validated_data['password'])
        user.save()
        return user