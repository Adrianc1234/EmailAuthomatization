# Usa una imagen base de Python
FROM python:3.9-slim

# Establece el directorio de trabajo
WORKDIR /app

# Copia el archivo requirements.txt
COPY requirements.txt .

# Instala las dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copia el contenido del proyecto en el contenedor
COPY . .

# Expone el puerto en el que corre la aplicación
EXPOSE 5000

# Define el comando de ejecución
CMD ["python", "app.py"]
