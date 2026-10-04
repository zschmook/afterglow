FROM python:3.12-alpine
WORKDIR /app
COPY requirements.txt ./
RUN apk add --no-cache gcc musl-dev linux-headers && pip install --no-cache-dir -r requirements.txt && apk del gcc musl-dev linux-headers
COPY server.py system_stats.py windows_gpu.py playlist.py media_relay.py home_devices.py home_config.py index.html app.js style.css ./
COPY assets assets
RUN mkdir -p /app/data && chown 10001:10001 /app/data
USER 10001:10001
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8080') + '/health', timeout=2)"
CMD ["python", "-u", "server.py"]
