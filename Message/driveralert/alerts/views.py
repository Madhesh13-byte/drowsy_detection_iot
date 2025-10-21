from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from twilio.rest import Client

# Twilio credentials
TWILIO_ACCOUNT_SID = 'AC58a64ca0d76f614ded05f815330ba4a0'
TWILIO_AUTH_TOKEN = '62ea03460006a09415fe084a216fda87'
TWILIO_PHONE_NUMBER = '+15856763409'  # Your Twilio trial phone number

RELATIVE_NUMBERS = [
    '+91 9361899478',  # Replace with your relative's phone number(s), including country code
]

@csrf_exempt
def send_alert(request):
    if request.method == 'POST':
        driver = request.POST.get('driver_name', 'Unknown')
        status = request.POST.get('status', 'No status')
        location = request.POST.get('location', 'No location')

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        message_body = f'ALERT: {driver} - {status}, Location: {location}'

        for number in RELATIVE_NUMBERS:
            client.messages.create(
                body=message_body,
                from_=TWILIO_PHONE_NUMBER,
                to=number
            )

        return JsonResponse({'message': 'Alert sent successfully!'})

    return JsonResponse({'error': 'Invalid request'}, status=400)