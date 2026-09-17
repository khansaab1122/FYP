FROM node:20

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Install Python dependencies for face recognition service
RUN pip3 install --no-cache-dir -r python_face_service/requirements.txt

# Build frontend + backend for production
RUN npm run build

EXPOSE 3000 8001

CMD bash -lc "python3 python_face_service/app.py > /tmp/face-service.log 2>&1 & npm run start"
