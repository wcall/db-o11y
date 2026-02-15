docker run --network host \
  -v /Users/wei-chincall/Workspace/Grafana/db-o11y/postgresql/config.alloy:/etc/alloy/config.alloy \
  -p 12345:12345 \
  grafana/alloy:v1.12.0 \
    run --stability.level=experimental --server.http.listen-addr=0.0.0.0:12345 \
    /etc/alloy/config.alloy &> alloy.docker.log.out
