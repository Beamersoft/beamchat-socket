FROM node:latest
RUN mkdir -p /home/beamchatsocket
WORKDIR /home/beamchatsocket
COPY . .
RUN npm install
RUN npm install nodemon -g
EXPOSE 3501
CMD ["nodemon", "index.js"]
