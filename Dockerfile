# Alpine-ஐப் பயன்படுத்துகிறோம்
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

# --- புரோபஷனல் முறையில் Environment Variables சேர்த்தல் ---
# Docker-க்கு வெளியே இருந்து (docker-compose) இந்த வேரியபிள்களைப் பெறுவோம்
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ARG NEXTAUTH_URL=http://localhost:3000

# இவற்றை Next.js பில்ட் எடுக்கும்போது பயன்படுத்த ENV-ஆக மாற்றுவோம்
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXTAUTH_URL=$NEXTAUTH_URL
# ---------------------------------------------------------

COPY package*.json ./

# React-konva வெர்ஷன் 18-ஐ உறுதிப்படுத்தவும்
RUN npm install --legacy-peer-deps

COPY . .

# Build செய்யும்போது canvas எரர் வராமல் தடுக்க மற்றும் Environment Variables-ஐ உள்ளே இழுக்க
RUN npm run build --legacy-peer-deps

EXPOSE 3000

CMD ["npm", "start"]