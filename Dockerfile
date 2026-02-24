# Alpine-ஐப் பயன்படுத்துகிறோம், ஆனால் இதில் கூடுதல் dependencies தேவை
FROM node:18-alpine

# Canvas மற்றும் பிற பில்ட் டூல்ஸ்களுக்குத் தேவையான சிஸ்டம் லைப்ரரிகள்
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

WORKDIR /app

COPY package*.json ./

# React-konva வெர்ஷன் 18-ஐ உறுதிப்படுத்தவும்
RUN npm install --legacy-peer-deps

COPY . .

# Build செய்யும்போது canvas எரர் வராமல் தடுக்க
RUN npm run build --legacy-peer-deps

EXPOSE 3000

CMD ["npm", "start"]