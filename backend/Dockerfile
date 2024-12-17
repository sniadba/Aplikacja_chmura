# Używamy oficjalnego obrazu Node.js
FROM node:18

# Ustawiamy katalog roboczy w kontenerze
WORKDIR /app

# Kopiujemy pliki z katalogu lokalnego do kontenera
COPY package*.json ./

# Instalujemy zależności (tutaj zainstaluje również bcryptjs)
RUN npm install

# Kopiujemy resztę plików aplikacji
COPY . .

# Otwieramy port, na którym działa serwer
EXPOSE 5001

# Uruchamiamy aplikację
CMD ["node", "server.js"]
