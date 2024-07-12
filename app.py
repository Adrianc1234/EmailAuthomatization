from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from PIL import Image, ImageDraw, ImageFont
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
import io
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")


# Ruta a la plantilla de fondo y las fuentes
template_path = 'static/images/plantilla.jpeg'
name_font_path = 'static/fonts/Inter-SemiBold.ttf'
level_font_path = 'static/fonts/Inter-Bold.ttf'
date_font_path = 'static/fonts/Inter-Regular.ttf'

name_font_size = 50
level_font_size = 220
date_font_size = 40

def get_current_month_year():
    months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    now = datetime.now()
    month = months[now.month - 1]
    year = now.year
    return f"{month} {year}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/csv')
def display():
    return render_template('display.html')

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    data = request.json
    names = [entry['name'] for entry in data]
    levels = [entry['level'] for entry in data]
    date = get_current_month_year()

    output_dir = "static/pdf"
    os.makedirs(output_dir, exist_ok=True)

    total_files = len(names)
    for i, (name, level) in enumerate(zip(names, levels)):
        # Crear una copia de la plantilla
        template = Image.open(template_path)
        cert = template.copy()
        draw = ImageDraw.Draw(cert)
        
        # Posiciones para el texto
        name_position = (cert.width // 2, 580)
        level_position = (cert.width // 2, cert.height // 2 + 150)
        date_position = (cert.width // 2, cert.height // 2 + 280)
        
        # Cargar fuentes con los tamaños especificados
        name_font = ImageFont.truetype(name_font_path, name_font_size)
        level_font = ImageFont.truetype(level_font_path, level_font_size)
        date_font = ImageFont.truetype(date_font_path, date_font_size)
        
        # Añadir el nombre
        draw.text(name_position, name, font=name_font, fill="#626060", anchor="mm")
        
        # Añadir el nivel
        draw.text(level_position, level, font=level_font, fill="#E19147", anchor="mm")

        # Añadir mes y año
        draw.text(date_position, date, font=date_font, fill="#626060", anchor="mm")
        
        # Guardar el certificado como imagen en un archivo temporal
        temp_image_path = os.path.join(output_dir, f'temp_certificate_{i+1}.png')
        cert.save(temp_image_path)

        # Convertir la imagen en PDF usando la ruta del archivo temporal
        pdf_path = os.path.join(output_dir, f'certificate_{name}.pdf')
        c = canvas.Canvas(pdf_path, pagesize=A4)
        c.drawImage(temp_image_path, 0, 0, width=A4[0], height=A4[1])
        c.showPage()
        c.save()

        # Eliminar el archivo temporal
        os.remove(temp_image_path)

        # Emitir el progreso al frontend
        socketio.emit('progress', {'task': 'pdf', 'current': i + 1, 'total': total_files})


    return {"status": "success", "message": "PDFs generated successfully"}

# Emite progreso desde el backend para los envíos de correos
@app.route('/send-email', methods=['POST'])
def send_email():
    try:
        data = request.json
        output_dir = "static/pdf"

        GMAIL_USER = data['gmail_user']
        GMAIL_PASSWORD = data['gmail_password']
        
        emails = [entry['email'] for entry in data['emails']]
        names = [entry['name'] for entry in data['emails']]
        level = [entry['level'] for entry in data['emails']]

        total_emails = len(emails)

        for i, (email, name, level) in enumerate(zip(emails, names, level)):
            pdf_path = os.path.join(output_dir, f'certificate_{name}.pdf')
            
            # Configurar el correo electrónico
            msg = MIMEMultipart()
            msg['From'] = GMAIL_USER
            msg['To'] = email
            msg['Subject'] = f"Bestschools Company celebrates your success. Your {level} certificate is here"
            body = f"Dear {name},\n\nWe are thrilled to inform you that you have successfully completed {level} of your English course! Your dedication and hard work have paid off, and it is our pleasure to present you with your Level Certificate.\n\nAttached to this email, you will find your official certificate recognizing your achievement.\n\nAt Bestschools Company, we are incredibly proud of your accomplishment. Congratulations once again, and we wish you all the best in your continued learning!\n\nBest regards,\n\nMarel"
            msg.attach(MIMEText(body, 'plain'))

            
            # Adjuntar el PDF
            attachment = open(pdf_path, "rb")
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f"attachment; filename= {pdf_path.split('/')[-1]}")
            msg.attach(part)
            
            # Enviar el correo electrónico
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(GMAIL_USER, GMAIL_PASSWORD)
            text = msg.as_string()
            server.sendmail(GMAIL_USER, email, text)
            server.quit()
            
            # Emitir el progreso al frontend
            socketio.emit('progress', {'task': 'email', 'current': i + 1, 'total': total_emails})

        return jsonify({'success': True, 'message': 'Emails sent successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
