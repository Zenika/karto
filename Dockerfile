FROM scratch

COPY ./back/karto /karto

ENTRYPOINT ["/karto"]
