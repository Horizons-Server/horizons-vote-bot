import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import type {
  BaseExternalAccountClient,
  Compute,
  Impersonated,
  JWT,
  UserRefreshClient,
} from "google-auth-library";
import { Proposal } from "../interfaces/Proposal";
import { AllProposals } from "../interfaces/AllProposals";
const sheets = google.sheets("v4");
const SHEET_ID = "1kKN0pLIOfLHy1O3AtKGd6Vw7OxU-Q88Jn4pli5m_MqU";
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const KEY_FILE = "credentials.json";

type SheetName = "Approved" | "Denied/Postponed" | "In Progress";
export type Auth =
  | JWT
  | Compute
  | UserRefreshClient
  | BaseExternalAccountClient
  | Impersonated;

/**
 * getAuthToken - authenticates the service account and returns an auth token
 *
 * @return authentication token for use in requests
 */
export async function getAuthToken() {
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
async function getSpreadSheet(spreadsheetId: string, auth: Auth) {
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
  auth: Auth,
  sheetName: SheetName,
) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    auth,
    range: sheetName,
    valueRenderOption: "FORMULA",
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
export async function addProposal(
  auth: Auth,
  proposal: Proposal,
  sheet: SheetName = "In Progress",
) {
  const request = {
    // The ID of the spreadsheet to update.
    spreadsheetId: SHEET_ID,

    // The A1 notation of a range to search for a logical table of data.
    // Values are appended after the last row of the table.
    range: `'${sheet}'!A3:K3`,

    // How the input data should be interpreted.
    valueInputOption: "USER_ENTERED",

    resource: {
      range: `'${sheet}'!A3:K3`,
      majorDimension: "ROWS",
      values: [
        [
          proposal.uuid,
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
          proposal.numExtensions,
          JSON.stringify(proposal.otherJson),
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

  let outDate;

  if (date.split("/").length == 3) outDate = new Date(date).getTime();
  else outDate = parseInt(date.split("/")[0].slice(1));

  if (isNaN(outDate)) return undefined;
  else return outDate;
}

/**
 * parseSheetProposals - parses a list  of objections into an array
 *
 * @param  rawInput objections from sheet
 * @return parsed objections
 */
function parseSheetProposals(rawInput: string) {
  try {
    let array = rawInput.split(",");
    array.forEach((item, i) => {
      array[i] = item.trim();
    });
    return array;
  } catch {
    return undefined;
  }
}

function parseJsonFromSheet(rawInput: string) {
  try {
    let parsed = JSON.parse(rawInput);
    return parsed;
  } catch {
    return rawInput;
  }
}

/**
 * arrayToProposal - converts an array from a sheet into a proposal object
 *
 * @param  input array to convert
 * @return converted proposal object
 */
function arrayToProposal(input: string[]) {
  let newProposal: Proposal = {
    uuid: input[0],
    name: input[1],
    proposedBy: input[2],
    type: input[3],
    description: input[4],
    coordinates: input[5] || undefined,
    imageLink: input[6] || undefined,
    threadLink: input[7],
    dateProposed: parseSheetDate(input[8]) ?? 0,
    actionDate: parseSheetDate(input[9]),
    objections: parseSheetProposals(input[10]) ?? ["0"],
    numExtensions: parseInt(input[11]),
    otherJson: parseJsonFromSheet(input[12]),
  };

  return newProposal;
}

/**
 * getAllProposals - gets all proposals from the sheet
 *
 * @param auth authToken
 * @return all proposals object
 */
export async function getAllProposals(auth: Auth) {
  let sheetsToIterate: SheetName[] = [
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

      if (values) {
        values.shift(); //ignore title rows
        values.shift();

        values.forEach((value: string[]) => {
          const proposal = arrayToProposal(value);
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
      }
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
export async function deDupe(auth: Auth) {
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
export async function removeProposal(
  auth: Auth,
  proposalId: string,
  allProposals?: AllProposals,
) {
  allProposals = allProposals || (await getAllProposals(auth));

  //figure out which sheet to delete from and where
  let sheetName: SheetName = "In Progress";
  let deletionIndex;
  if (allProposals.approved.filter((x) => x.uuid == proposalId).length > 0) {
    sheetName = "Approved";
    deletionIndex = allProposals.approved.findIndex(
      (x) => x.uuid == proposalId,
    );
  } else if (
    allProposals.denied.filter((x) => x.uuid == proposalId).length > 0
  ) {
    sheetName = "Denied/Postponed";
    deletionIndex = allProposals.denied.findIndex((x) => x.uuid == proposalId);
  } else if (
    allProposals.inProgress.filter((x) => x.uuid == proposalId).length > 0
  ) {
    sheetName = "In Progress";
    deletionIndex = allProposals.inProgress.findIndex(
      (x) => x.uuid == proposalId,
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
