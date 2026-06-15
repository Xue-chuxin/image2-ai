# 美国 SOCKS5 代理配置

在美国原生 IP 服务器上搭建 SOCKS5 代理，让主服务器通过它访问 ChatGPT。

---

## Ubuntu / Debian

```bash
apt-get update && apt-get install -y dante-server

cat > /etc/danted.conf << 'EOF'
internal: 0.0.0.0 port = 1080
external: eth0
method: none
client pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
}
socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
}
EOF

systemctl enable danted
systemctl restart danted
ufw allow 1080/tcp
ss -tlnp | grep 1080
```

---

## CentOS 7

```bash
yum install -y dante-server

cat > /etc/danted.conf << 'EOF'
logoutput: /var/log/danted.log
internal: 0.0.0.0 port = 1080
external: eth0
method: none
client pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
}
socks pass {
    from: 0.0.0.0/0 to: 0.0.0.0/0
}
EOF

systemctl start danted
systemctl enable danted

firewall-cmd --add-port=1080/tcp --permanent 2>/dev/null
firewall-cmd --reload 2>/dev/null
iptables -I INPUT -p tcp --dport 1080 -j ACCEPT 2>/dev/null

ss -tlnp | grep 1080
```

---

## CentOS 7 网卡名不是 eth0 的修复

```bash
# 查看实际网卡名
ip addr show | grep -E "^[0-9]:" | awk '{print $2}' | tr -d ':'

# 假设是 ens3，修改配置
sed -i 's/external: eth0/external: ens3/' /etc/danted.conf
systemctl restart danted
```

---

## 验证

主服务器执行：

```bash
curl -s --socks5 美国IP:1080 https://chatgpt.com -o /dev/null -w "HTTP %{http_code}\n"
```

返回 `HTTP 200` 即成功。
