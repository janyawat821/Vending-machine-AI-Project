# backend/Dockerfile — สร้างอิมเมจเดียวที่รันทั้งเว็บ (build จาก root: docker build -f backend/Dockerfile -t hoshimori .)
FROM node:20-alpine
WORKDIR /app
COPY backend/package.json backend/
RUN cd backend && npm install --omit=dev
COPY backend backend
COPY frontend frontend
WORKDIR /app/backend
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
