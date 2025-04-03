# Backend
FROM python:3.9-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install -r requirements.txt

COPY backend /app

CMD ["python", "app.py"]

# Frontend
FROM node:16 as frontend

WORKDIR /app

COPY frontend/package.json .
COPY frontend/package-lock.json .
RUN npm install

COPY frontend /app

RUN npm run build

# Final Image
FROM python:3.9-slim

WORKDIR /app

COPY --from=frontend /app/build /app/frontend/build
COPY backend /app

RUN pip install -r requirements.txt

EXPOSE 5000

CMD ["python", "app.py"]
