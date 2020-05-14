FROM scratch

COPY ./network-policy-explorer /network-policy-explorer
COPY ./front/build /front/build

ENTRYPOINT ["/network-policy-explorer"]
