const express = require("express");
const moment = require("moment-timezone");
const ld = require("lodash");
require("dotenv").config();
const {
  authorize1,
  saveInDB,
  getProviderCalenderIdAndTimeZone,
  getCalenderInstance,
} = require("./serviceUtil");
const bodyParser = require("body-parser");
const { authorizationMiddleWare } = require("./middleware");
const {
  generateTimeSlots,
  getEventsSeparatedInStartTimeAndEndTime,
} = require("./calenderUtils");

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
  const {
    appointee,
    provider,
    startTime,
    endTime,
    appointeeTimezone,
    duration,
  } = req.body; //timezones are in isoStringFormat
  const calendar = await authorize1(provider)
    .then(getCalenderInstance)
    .catch(console.error);
  const calenders = await calendar.calendarList.list();
  console.log(calenders);
  if (calenders.data == null) {
    return res.status(500).json({ msg: "Internal Server Error" });
  }
  const primaryCalender = calenders.data.items.filter((cal) => {
    return cal.primary == true;
  })[0];

  const { providerId, providerTimezone } = {
    providerId: primaryCalender.id,
    providerTimezone: primaryCalender.timeZone,
  };
  // convert appointee time to provider's timezone, both startime and endtime
  const inputStartDate = moment.tz(startTime, appointeeTimezone, true);
  const convertedStartTime = inputStartDate.clone().tz(providerTimezone);
  const inputEndDate = moment.tz(endTime, appointeeTimezone);
  const convertedEndTime = inputEndDate.clone().tz(providerTimezone);
  const eventData = await calendar.events.list({
    calendarId: providerId,
    timeMin: new Date(convertedStartTime.format()).toISOString(),
    timeMax: new Date(convertedEndTime.format()).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  const events = eventData.data.items;

  // after getting the results convert the time slots to appointee time zone
  const { eventStartTimes, eventEndtimes } =
    getEventsSeparatedInStartTimeAndEndTime(events);
  const modStartDate = convertedStartTime.toDate().setHours(0, 0, 0, 0);
  const modEndDate = convertedEndTime.toDate().setHours(23, 59, 59, 999);
  const timeSlots = generateTimeSlots(
    modStartDate,
    modEndDate,
    duration,
    eventStartTimes,
    eventEndtimes,
    appointeeTimezone
  );
  return res.json({ timeSlots: timeSlots });
});



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
