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
  const appointeeOffset = moment.tz(appointeeTimezone).utcOffset();
  // const providerOffset = moment.tz(providerTimezone).utcOffset();
  // const inputStartDate = moment.tz(startTime, appointeeTimezone);
  const inputStartDate =
    new Date(startTime).getTime() + -appointeeOffset * 60 * 1000;
  const convertedStartTime = new Date(inputStartDate);
  const inputEndDate =
    new Date(endTime).getTime() + -appointeeOffset * 60 * 1000;
  const convertedEndTime = new Date(inputEndDate);
  const eventData = await calendar.events.list({
    calendarId: providerId,
    timeMin: new Date(convertedStartTime).toISOString(),
    timeMax: new Date(convertedEndTime).toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });
  const events = eventData.data.items;

  // after getting the results convert the time slots to appointee time zone
  const { eventStartTimes, eventEndtimes } =
    getEventsSeparatedInStartTimeAndEndTime(events);
  const modStartDate = convertedStartTime.setHours(0, 0, 0, 0); // convert it to next recent hour
  const modEndDate = convertedEndTime.setHours(23, 59, 59, 999); // convert it to last recent hour
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

app.get("/book-appointment", authorizationMiddleWare, async (req, res) => {
  const { appointee, provider, startTime, endTime, appointeeTimezone } =
    req.body;

  const calendar = await authorize1(provider)
    .then(getCalenderInstance)
    .catch(console.error);

  const appointeeOffset = moment.tz(appointeeTimezone).utcOffset();
  const inputStartDate =
    new Date(startTime).getTime() + -appointeeOffset * 60 * 1000;
  const start = new Date(inputStartDate).toISOString();
  const inputEndDate =
    new Date(endTime).getTime() + -appointeeOffset * 60 * 1000;
  const end = new Date(inputEndDate).toISOString();

  const eventData = await calendar.events.list({
    calendarId: provider,
    timeMin: start,
    timeMax: end,
    singleEvents: true,
    orderBy: "startTime",
  });
  const events = eventData.data.items;
  if (events.length > 0) {
    return res
      .status(400)
      .json({ msg: "Slot already booked! Please try a different slot" });
  }

  const event = {
    summary: "PetaVue",
    description: "Discuss project plans",
    start: {
      dateTime: `${start}`,
      timeZone: `${appointeeTimezone}`,
    },
    end: {
      dateTime: `${end}`,
      timeZone: `${appointeeTimezone}`,
    },
    attendees: [{ email: `${appointee}` }, { email: `${provider}` }],
  };
  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });
  return res.json({ msg: response.data });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
