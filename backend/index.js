const express = require("express");
const {
  authorize1,
  saveInDB,
  getProviderCalenderIdAndTimeZone,
} = require("./serviceUtil");
const bodyParser = require("body-parser");
const { authorizationMiddleWare } = require("./middleware");

const PORT = 8080;

const app = express();
app.use(bodyParser.json());

// sign in
// save refreshAccessToken in DB
app.post("/signin", async (req, res) => {
  const { email } = req.body;
  let profile = await authorize1(email).then(saveInDB).catch(console.error);
  if (!profile) return res.sendStatus(500);
  return res.json(profile);
});

app.get("/getslots", authorizationMiddleWare, async (req, res) => {
  const { appointee, provider, startTime, endTime, appointeeTimezone } =
    req.body; //timezones are in isoStringFormat
  const { providerId, providerTimezone } = await authorize1(provider)
    .then(getProviderCalenderIdAndTimeZone)
    .catch(console.error);

  const bookedTimeSlots = await authorize1(provider)
  .then(getProviderCalenderIdAndTimeZone)
  .catch(console.error);

  return res.json({ msg: "fine" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
