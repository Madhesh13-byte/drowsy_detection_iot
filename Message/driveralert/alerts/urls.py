from django.urls import path
from .views import send_alert

urlpatterns = [
    path('alert/', send_alert, name='send_alert'),
]
