var config = {
    address: "",
    username: "",
    password: "",
    virtualserverID: 1, // don't change unless you know what you're doing
    port: 0, // default 1337, !! SSL USES THIS + 1 !! (i.e. default 1338)
    ssl_cert_path: "", // path to SSL certificate, optional
    ssl_key_path: "" // path to SSL certificate key, optional
};

module.exports = config;
