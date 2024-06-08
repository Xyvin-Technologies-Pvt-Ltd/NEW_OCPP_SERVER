async function generateUniqueTransactionID(length) {
    // Generate a random number (you can use a more sophisticated random number generator)
    const randomNumber = Math.floor(Math.random() * 900000) + 100000;

  
    // Append a timestamp to ensure uniqueness
    const timestamp = Date.now();
  
    // Combine the random number and timestamp to create the transaction ID
    const transactionID = `${randomNumber}${timestamp}`;
  
    return parseInt(transactionID.slice(0, length), 10); // Convert the ID to an integer
  }
  


  module.exports = {generateUniqueTransactionID}