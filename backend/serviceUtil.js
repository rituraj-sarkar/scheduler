const path = require("path");
const process = require("process");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");
const fs = require("fs").promises;
const { User } = require("./db");

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
];

async function loadSavedCredentialsIfExist1(email) {
  try {
    const content = await User.findOne({ email });
    if (!content) return null;
    const json = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(json);
    const key = keys.installed || keys.web;
    const credentials = {
      type: "authorized_user",
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: content.refreshAccessToken,
    };
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

async function authorize1(email) {
  let client = await loadSavedCredentialsIfExist1(email);
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  return client;
}

async function saveInDB(auth) {
  const googleAuth = google.oauth2({ version: "v2", auth });

  const googleUserInfo = await googleAuth.userinfo.get();
  const email = googleUserInfo.data.email;

  const user = await User.findOne({ email });
  if (!user)
    await User.create({
      email,
      refreshAccessToken: auth.credentials.refresh_token,
    });
  else {
    user.refreshAccessToken = auth.credentials.refresh_token;
    await user.save();
  }

  return { email, refreshAccessToken: auth.credentials.refresh_token };
}

async function getProviderCalenderIdAndTimeZone(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.calendarList.list();
  console.log(res);
  if (res.data) {
    const primaryCalender = res.data.items.filter((cal) => {
      return cal.primary == true;
    })[0];
    return {
      providerId: primaryCalender.id,
      providerTimezone: primaryCalender.timeZone,
    };
  }
  return null;
}

async function bookedTimeSlots(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: startTime.toISOString(),
    timeMax: endTime.toISOString(),
    timeZone: "America/New_York",
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime",
  });
  const events = res.data.items;
}

async function getCalenderInstance(auth) {
  const calendar = google.calendar({ version: "v3", auth });
  return calendar;
}

module.exports = {
  authorize1,
  saveInDB,
  getProviderCalenderIdAndTimeZone,
  getCalenderInstance
};
