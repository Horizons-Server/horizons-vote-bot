interface Proposal {
  uid: number;
  name: string;
  proposedBy: string;
  type: string;
  description: string;
  coordinates?: string;
  imageLink?: string;
  threadLink: string;
  dateProposed: number;
  actionDate?: number;
  objections?: Array<string>;
}

interface AllProposals {
  approved: Array<Proposal>;
  denied: Array<Proposal>;
  inProgress: Array<Proposal>;
  all: Array<Proposal>;
}

type SheetName = "Approved" | "Denied/Postponed" | "In Progress";

const { google } = require("googleapis");
const { GoogleAuth } = require("google-auth-library");
const sheets = google.sheets("v4");
const SHEET_ID = "1kKN0pLIOfLHy1O3AtKGd6Vw7OxU-Q88Jn4pli5m_MqU";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const KEY_FILE = "credentials.json";

/**
 * getAuthToken - authenticates the service account and returns an auth token
 *
 * @return authentication token for use in requests
 */
async function getAuthToken() {
  const auth = new GoogleAuth({
    keyFile: KEY_FILE,
    scopes: SCOPES,
  });
  const authToken = await auth.getClient();
  return authToken;
}

/**
 * getSpreadSheet - gets metadata of a spreadsheet
 *
 * @param  spreadsheetId sheet id to retrieve
 * @param  auth authToken
 * @return all sheet information
 */
async function getSpreadSheet(spreadsheetId: string, auth: string) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    auth,
  });
  return res;
}

/**
 * getSpreadSheetValues - returns values for a specific tab in a sheet
 *
 * @param  spreadsheetId sheet id to retrieve
 * @param  auth authToken
 * @param  sheetName tab to get
 * @return sheet values
 */
async function getSpreadSheetValues(
  spreadsheetId: string,
  auth: string,
  sheetName: SheetName
) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    auth,
    range: sheetName,
  });
  return res;
}

/**
 * addProposal - adds a proposal to the bottom of a sheet
 *
 * @param  auth authToken
 * @param  proposal proposal object to add
 * @param  [sheet="In Progress"] sheet to add proposal to
 * @return append response from google, else returns error
 */
async function addProposal(auth: string, proposal: Proposal, sheet?: string) {
  const request = {
    // The ID of the spreadsheet to update.
    spreadsheetId: SHEET_ID,

    // The A1 notation of a range to search for a logical table of data.
    // Values are appended after the last row of the table.
    range: `'${sheet ?? "In Progress"}'!A3:K3`,

    // How the input data should be interpreted.
    valueInputOption: "USER_ENTERED",

    resource: {
      range: `'${sheet ?? "In Progress"}'!A3:K3`,
      majorDimension: "ROWS",
      values: [
        [
          proposal.uid,
          proposal.name,
          proposal.proposedBy,
          proposal.type,
          proposal.description,
          proposal.coordinates ?? "",
          proposal.imageLink ?? "",
          proposal.threadLink,
          "=" + proposal.dateProposed + "/1000/60/60/24 + DATE(1970,1,1)",
          proposal.actionDate != undefined
            ? "=" + proposal.actionDate + "/1000/60/60/24 + DATE(1970,1,1)"
            : "",
          proposal.objections?.toString() ?? "0",
        ],
      ],
    },

    auth,
  };

  try {
    const response = (await sheets.spreadsheets.values.append(request)).data;
    console.log(JSON.stringify(response, null, 2));
    return response;
  } catch (err) {
    return err;
  }
}

/**
 * parseSheetDate - parses a date from the google sheet into a unix timestamp
 *
 * @param  date input string from sheet
 * @return unix timestamp
 */
function parseSheetDate(date: string) {
  if (date == undefined) return undefined;
  if (date.split("/").length == 3) return new Date(date).getTime();

  return parseInt(date.split("/")[0].substr(1));
}

/**
 * arrayToProposal - converts an array from a sheet into a proposal object
 *
 * @param  input array to conver
 * @return converted proposal object
 */
function arrayToProposal(input: Array<string>) {
  let newProposal: Proposal = {
    uid: parseInt(input[0]),
    name: input[1],
    proposedBy: input[2],
    type: input[3],
    description: input[4],
    coordinates: input[5] || undefined,
    imageLink: input[6] || undefined,
    threadLink: input[7],
    dateProposed: parseSheetDate(input[8]) ?? 0,
    actionDate: parseSheetDate(input[9]),
  };

  return newProposal;
}

/**
 * getAllProposals - gets all proposals from the sheet
 *
 * @param auth authToken
 * @return all proposals object
 */
async function getAllProposals(auth: string) {
  let sheetsToIterate: Array<SheetName> = [
    "Approved",
    "In Progress",
    "Denied/Postponed",
  ];

  let output: AllProposals = {
    approved: [],
    denied: [],
    inProgress: [],
    all: [],
  };

  let gettingSheets = new Promise((resolve) => {
    let numToResolve = sheetsToIterate.length;
    sheetsToIterate.forEach(async (sheetName) => {
      let spreadsheet = await getSpreadSheetValues(SHEET_ID, auth, sheetName);
      let values = spreadsheet.data.values;

      values.shift(); //ignore title rows
      values.shift();

      values.forEach((value: Array<string>) => {
        let proposal = arrayToProposal(value);
        switch (sheetName) {
          case "Approved":
            output.approved.push(proposal);
            break;
          case "In Progress":
            output.inProgress.push(proposal);
            break;
          case "Denied/Postponed":
            output.denied.push(proposal);
            break;
        }
        output.all.push(proposal);
      });

      numToResolve--;
      if (numToResolve == 0) resolve(true);
    });
  });

  await gettingSheets;
  return output;
}

/**
 * deDupe - same as "remove duplicates" in sheets.
 * doesn't cross-check between tabs
 *
 * @param  authToken
 * @return batch response from google or error
 */
async function deDupe(auth: string) {
  const request = {
    // The spreadsheet to apply the updates to.
    spreadsheetId: SHEET_ID,

    resource: {
      requests: [
        {
          deleteDuplicates: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              startColumnIndex: 0,
              endColumnIndex: 11,
            },
            comparisonColumns: [
              {
                sheetId: 0,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 11,
              },
            ],
          },
        },
        {
          deleteDuplicates: {
            range: {
              sheetId: 218609302,
              startRowIndex: 0,
              startColumnIndex: 0,
              endColumnIndex: 11,
            },
            comparisonColumns: [
              {
                sheetId: 218609302,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 11,
              },
            ],
          },
        },
        {
          deleteDuplicates: {
            range: {
              sheetId: 106354102,
              startRowIndex: 0,
              startColumnIndex: 0,
              endColumnIndex: 11,
            },
            comparisonColumns: [
              {
                sheetId: 106354102,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 11,
              },
            ],
          },
        },
      ],
    },

    auth,
  };

  try {
    const response = (await sheets.spreadsheets.batchUpdate(request)).data;
    return response;
  } catch (err) {
    return err;
  }
}

/**
 * removeProposal - removes a proposal from the sheet
 *
 * @param  auth authToken
 * @param  proposalId id of the proposal to remove
 * @param  [allProposals] list of all proposals and their locations, will be retrieved if not provided
 * @return list of all proposals
 */
async function removeProposal(
  auth: string,
  proposalId: number,
  allProposals?: AllProposals
) {
  allProposals = allProposals || (await getAllProposals(auth));

  //figure out which sheet to delete from and where
  let sheetName: SheetName = "In Progress";
  let deletionIndex;
  if (allProposals.approved.filter((x) => x.uid == proposalId).length > 0) {
    sheetName = "Approved";
    deletionIndex = allProposals.approved.findIndex((x) => x.uid == proposalId);
  } else if (
    allProposals.denied.filter((x) => x.uid == proposalId).length > 0
  ) {
    sheetName = "Denied/Postponed";
    deletionIndex = allProposals.denied.findIndex((x) => x.uid == proposalId);
  } else if (
    allProposals.inProgress.filter((x) => x.uid == proposalId).length > 0
  ) {
    sheetName = "In Progress";
    deletionIndex = allProposals.inProgress.findIndex(
      (x) => x.uid == proposalId
    );
  }

  //adjust for headers
  if (deletionIndex != undefined && deletionIndex >= 0) deletionIndex += 3;

  const request = {
    // The ID of the spreadsheet to update.
    spreadsheetId: SHEET_ID,

    // The A1 notation of the values to update.
    range: `'${sheetName}'!A${deletionIndex}:K${deletionIndex}`,

    auth,
  };

  try {
    const response = (await sheets.spreadsheets.values.clear(request)).data;
    return response;
  } catch (err) {
    return err;
  }
}

module.exports = {
  getAuthToken,
  addProposal,
  removeProposal,
  getAllProposals,
  deDupe,
};

//just some demo testing functions below
// getAuthToken().then((authToken) => {
//   let newProposal: Proposal = {
//     uid: 24,
//     name: "Test Proposal",
//     proposedBy: "scary",
//     type: "town",
//     description: "a thing",
//     threadLink: "https://google.com",
//     dateProposed: Date.now(),
//   };
// getAllProposals(authToken).then(console.log);
//
// addProposal(authToken, newProposal).then((result) => {
//   console.log(result);
// });
//
// removeProposal(authToken, 24);
//
// deDupe(authToken).then(console.log);
// });
