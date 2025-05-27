// utils/address.js
const { ethers } = require("ethers");

/**
 * Ensures an Ethereum address is properly checksummed according to EIP-55
 * @param {string} address - Ethereum address to format
 * @returns {string} Properly checksummed address
 * @throws Will throw an error if the address is invalid
 */
function ensureChecksumAddress(address) {
  try {
    // First convert to lowercase to handle mixed-case inputs
    const lowercaseAddress = address.toLowerCase();
    // Then get the proper checksum format
    return ethers.getAddress(lowercaseAddress);
  } catch (error) {
    throw new Error(`Invalid Ethereum address: ${address}. ${error.message}`);
  }
}

/**
 * Validates and properly checksums an array of Ethereum addresses
 * @param {string[]} addresses - Array of Ethereum addresses
 * @returns {string[]} Array of properly checksummed addresses
 * @throws Will throw an error if any address is invalid
 */
function ensureChecksumAddresses(addresses) {
  return addresses.map(address => ensureChecksumAddress(address));
}

/**
 * Validates that an address is properly formatted and checksummed
 * @param {string} address - Ethereum address to validate
 * @returns {boolean} True if the address is valid and checksummed correctly
 */
function isValidChecksumAddress(address) {
  try {
    // Get the proper checksum format for comparison
    const checksumAddress = ethers.getAddress(address.toLowerCase());
    // Compare with the original to ensure it was already checksummed properly
    return address === checksumAddress;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if two Ethereum addresses are the same (case-insensitive comparison)
 * @param {string} address1 - First Ethereum address
 * @param {string} address2 - Second Ethereum address
 * @returns {boolean} True if the addresses are the same
 */
function isSameAddress(address1, address2) {
  try {
    return ensureChecksumAddress(address1) === ensureChecksumAddress(address2);
  } catch (error) {
    return false;
  }
}

module.exports = {
  ensureChecksumAddress,
  ensureChecksumAddresses,
  isValidChecksumAddress,
  isSameAddress
};