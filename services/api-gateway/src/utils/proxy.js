const axios = require("axios");

async function proxyToService({ req, res, baseURL, path }) {
  try {
    const url = `${baseURL}${path}`;
    const method = req.method.toLowerCase();
    const headers = {};
    if (req.header("authorization")) headers.authorization = req.header("authorization");
    if (req.header("content-type")) headers["content-type"] = req.header("content-type");

    const response = await axios.request({
      url,
      method,
      headers,
      data: req.body,
      params: req.query,
      validateStatus: () => true
    });

    return res.status(response.status).json(response.data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(502).json({ error: "BAD_GATEWAY" });
  }
}

module.exports = { proxyToService };

