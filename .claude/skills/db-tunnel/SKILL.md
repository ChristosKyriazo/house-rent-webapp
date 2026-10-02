---
name: db-tunnel
description: Print the SSH tunnel command needed to connect local dev to the staging database on port 5433. Use when the user can't connect to the database or asks how to start the tunnel.
disable-model-invocation: true
---

Print this to the user and tell them to run it in a dedicated terminal (it blocks — that's normal, it keeps the tunnel open):

```
ssh -i ~/.ssh/deploy_key -L 5433:172.18.0.2:5432 deploy@116.203.100.64 -N
```

Then remind them their `.env` DATABASE_URL should be:
```
DATABASE_URL="postgresql://houserent:<password>@localhost:5433/house_rent"
```

To verify the tunnel is running they can check: `lsof -i :5433`
