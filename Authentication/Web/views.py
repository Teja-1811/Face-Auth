import os
import cv2
import numpy as np
import mediapipe as mp
import face_recognition
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import AuthenticationForm
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
import base64
from .models import CustomUser

def index(request):
    return render(request, 'index.html')

def register(request):
    if request.method == 'POST':
        fname = request.POST.get('fname')
        lname = request.POST.get('lname')
        username = request.POST.get('username')
        password = request.POST.get('password1')
        image_data = request.POST.get('captured_image')

        print(f"🔹 Received Data -> Username: {username}, Password: {password}, Image Length: {len(image_data) if image_data else 'None'}")

        if not (username and password and image_data):
            return render(request, 'index.html', {'error': 'All fields are required!'})

        if CustomUser.objects.filter(username=username).exists():
            return render(request, 'index.html', {'error': 'Username already exists'})

        user = CustomUser.objects.create_user(first_name=fname, last_name=lname, username=username, password=password)

        try:
            # Convert image from base64 and save
            format, imgstr = image_data.split(';base64,')
            ext = format.split('/')[-1]
            image_file = ContentFile(base64.b64decode(imgstr), name=f'{username}.{ext}')
            image_path = default_storage.save(f'user_images/{image_file.name}', image_file)
            
            cv2.imwrite(image_path)
            
            # Encode face
            encoded_image = face_recognition.load_image_file(image_path)
            encodings = face_recognition.face_encodings(encoded_image)
            if encodings:
                user.face_encoding = encodings[0].tobytes()
                user.save()
                login(request, user)
                return redirect('register_success')
            else:
                return render(request, 'index.html', {'error': 'Face not recognized. Try again!'})

        except Exception as e:
            return render(request, 'index.html', {'error': f'Error processing image: {str(e)}'})

    return render(request, 'index.html')


def user_login(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        image_data = request.POST.get('captured_image')
        print(f"Received Data -> Username: {username}, Password: {password}, Image Length: {len(image_data) if image_data else 'None'}")

        if username and password and image_data:
            user = authenticate(username=username, password=password)
            if user:
                stored_encoding = np.frombuffer(user.face_encoding, dtype=np.float64)
                try:
                    format, imgstr = image_data.split(';base64,')
                    ext = format.split('/')[-1]
                    image_file = ContentFile(base64.b64decode(imgstr), name=f'{username}_login.{ext}')
                    image_path = default_storage.save(f'user_images/{image_file.name}', image_file)
                    full_image_path = os.path.join(settings.MEDIA_ROOT, image_path)

                    image = face_recognition.load_image_file(full_image_path)
                    encodings = face_recognition.face_encodings(image)
                    if encodings and face_recognition.compare_faces([stored_encoding], encodings[0])[0]:
                        login(request, user)
                        return redirect('login_success')
                    else:
                        return render(request, 'index.html', {'error': 'Face mismatch. Try again!'})
                except Exception as e:
                    return render(request, 'index.html', {'error': f'Error processing image: {str(e)}'})

    return render(request, 'index.html')
