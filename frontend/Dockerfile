FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY app.js /usr/share/nginx/html/app.js

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --spider -q http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
