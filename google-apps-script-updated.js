// Updated Google Apps Script with Duplicate Detection
// Copy this code to your Google Apps Script editor

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  try {
    Logger.log('Request received');

    if (!e.postData) {
      Logger.log('ERROR: No postData');
      return ContentService.createTextOutput(JSON.stringify({
        result: 'error',
        error: 'No postData received'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    Logger.log('Post data contents: ' + e.postData.contents);

    var data = JSON.parse(e.postData.contents);
    Logger.log('Parsed data: ' + JSON.stringify(data));

    // Check for duplicate email (column C)
    var emailColumn = sheet.getRange('C:C').getValues();
    var email = data.email.toLowerCase().trim();

    for (var i = 1; i < emailColumn.length; i++) { // Start at 1 to skip header
      if (emailColumn[i][0] && emailColumn[i][0].toString().toLowerCase().trim() === email) {
        Logger.log('Duplicate email found: ' + email);
        return ContentService.createTextOutput(JSON.stringify({
          result: 'error',
          error: 'duplicate',
          message: 'This email has already been registered'
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Append row with form data
    sheet.appendRow([
      data.firstName,
      data.lastName,
      data.email,
      data.phone,
      data.timestamp
    ]);

    Logger.log('Row appended successfully');

    return ContentService.createTextOutput(JSON.stringify({
      result: 'success',
      message: 'Data saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(error) {
    Logger.log('ERROR: ' + error.toString());

    return ContentService.createTextOutput(JSON.stringify({
      result: 'error',
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function
function testDoPost() {
  var testData = {
    postData: {
      contents: JSON.stringify({
        firstName: 'DIRECT_TEST',
        lastName: 'FROM_SCRIPT',
        email: 'scripttest@makena.com',
        phone: '+33612345678',
        timestamp: new Date().toISOString()
      })
    }
  };

  var result = doPost(testData);
  Logger.log('Test result: ' + result.getContent());
}
