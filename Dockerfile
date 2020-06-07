FROM scratch

COPY ./karto /karto
COPY ./front/build /front/build

ENTRYPOINT ["/karto"]
