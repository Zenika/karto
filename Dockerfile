FROM scratch

COPY ./karto /karto

ENTRYPOINT ["/karto"]
