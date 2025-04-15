

import Instance from '../Data/Instance/Instance';
import BConstant from './B.Constant';
import './B.Text'
import $ from "jquery"
import T3Util from '../Util/T3Util';

/**
 * The Spell class provides comprehensive spell checking functionality for text elements
 * within a document. It supports both local and remote spell checking, management of a word
 * cache, and a custom user dictionary that can be loaded from and saved to a server.
 *
 * Key features:
 * - Initialization of the spell checking system and user dictionary.
 * - Enabling/disabling spell checking and querying its status.
 * - Spell checking individual text objects or all text objects in a document.
 * - Local spell checking using a cache to quickly determine word correctness and retrieve suggestions.
 * - Remote spell checking for words requiring further server-side analysis.
 * - Dynamic management of the user dictionary (adding, removing, clearing words) with persistent storage.
 * - Fuzzy matching to provide user dictionary-based suggestion recommendations.
 * - Support for ignore rules (e.g., all uppercase words, initial capitals, mixed alphanumeric words).
 * - Contextual spell menu support that displays correction suggestions and allows replace, add, or ignore actions.
 *
 * Example usage:
 *
 * ```typescript
 * // Assume 'doc' is an instance of a document containing text elements.
 * const spellChecker = new Spell(doc);
 *
 * // Initialize the spell checker with the browser's default dictionary.
 * spellChecker.Initialize();
 *
 * // Load user-specific dictionary entries.
 * spellChecker.UserInitialize();
 *
 * // Activate spell checking.
 * spellChecker.SetActive(true);
 *
 * // Get a text object from the document (assuming it supports spell checking).
 * const textObject = doc.GetElementByIndex(0); // Retrieval method based on the document structure.
 *
 * // Check the spelling for the text object, forcing a recheck of all words.
 * spellChecker.CheckSpellingForTextObj(textObject, true);
 *
 * // Display the spell menu at a specific character index and position.
 * spellChecker.ShowSpellMenu(textObject, 5, 100, 150);
 *
 * // Add a custom word to the user's dictionary.
 * spellChecker.AddWord("customterm");
 *
 * // Retrieve the list of words currently ignored during the session.
 * const ignoredWords = spellChecker.GetIgnoreList();
 * console.log("Ignored Words:", ignoredWords);
 * ```
 *
 * @remarks
 * The Spell class interacts with several external modules/constants:
 * - BConstant: Provides various constants, including dictionary mappings, spell flags, and word states.
 * - Text: Represents a text element that supports spelling check functionality.
 * - T3Util: Utility functions used for logging and other helper operations.
 * - FuzzySet: Implements fuzzy matching to assist with generating suggestions from the user dictionary.
 *
 * @public
 */
class Spell {

  public doc: any;
  public isActive: boolean;
  public isInitialized: boolean;
  public inProcessSpellList: any;
  public inProcessCallback: any;
  public spellMenuRequest: any;
  public spellMenuData: any;
  public wordCache: any;
  public userDict: any;
  public ignoreList: any;
  public userSpell: any;
  public curDict: any;
  public inAsyncSpellCheck: boolean;
  public bIgnoreAllCaps: boolean;
  public bIgnoreInitCaps: boolean;
  public bIgnoreMixedCaps: boolean;
  public bIgnoreMixedAlphaNum: boolean;
  public bAutoCorrect: boolean;

  /**
   * Initializes a new instance of the Spell class for text spell checking
   *
   * The Spell class provides spell checking functionality for text elements in a document,
   * including detection of misspelled words, suggestions, custom dictionaries, and various
   * options to control spell checking behavior.
   *
   * @param document - The document containing text elements to be spell checked
   */
  constructor(document) {
    this.doc = document;
    this.isActive = false;
    this.isInitialized = false;
    this.inProcessSpellList = null;
    this.inProcessCallback = null;
    this.spellMenuRequest = null;
    this.spellMenuData = null;
    this.wordCache = {};
    this.userDict = [];
    this.ignoreList = [];
    this.userSpell = null;
    this.curDict = BConstant.DictMap.en;
    this.inAsyncSpellCheck = false;
    this.bIgnoreAllCaps = false;
    this.bIgnoreInitCaps = false;
    this.bIgnoreMixedCaps = false;
    this.bIgnoreMixedAlphaNum = false;
    this.bAutoCorrect = false;
  }

  /**
   * Initializes the spell checking system with default dictionary
   * Sets up the necessary components for spell checking and marks the system as initialized
   */
  Initialize() {
    this.curDict = Spell.FindDefaultDictionary();
    this.isInitialized = true;
  }

  /**
   * Loads user dictionary data for custom spell checking
   * Called after basic initialization to add user-specific words and preferences
   */
  UserInitialize() {
    this.LoadUserDict();
  }

  /**
   * Sets the active state of the spell checker
   * @param isActive - Boolean indicating whether spell checking should be active
   */
  SetActive(isActive) {
    this.isActive = isActive;
  }

  /**
   * Gets the current active state of the spell checker
   * @returns Boolean indicating whether spell checking is currently active and initialized
   */
  GetActive() {
    const status = this.isInitialized && this.isActive;
    return status;
  }

  /**
   * Checks if an asynchronous spell check operation is currently in progress
   * @returns Boolean indicating if asynchronous spell checking is active
   */
  InAsyncSpellCheck() {
    return this.inAsyncSpellCheck;
  }

  /**
   * Clears the asynchronous spell check flag
   * Used to mark that any ongoing asynchronous spell check operations have completed
   */
  ClearAsyncSpellCheck() {
    this.inAsyncSpellCheck = false;
  }

  /**
   * Performs spell checking on a specific text object
   * @param textObj - The text object to check spelling for
   * @param forceRecheck - Boolean indicating whether to force a full recheck
   * @returns Boolean indicating if spell checking was performed
   */
  CheckSpellingForTextObj(textObj, forceRecheck) {

    if (!this.GetActive() || !textObj.GetSpellCheck()) {
      return false;
    }

    const spellCheckList = textObj.GetSpellCheckList();

    if (forceRecheck) {
      for (let i = 0; i < spellCheckList.list.length; i++) {
        spellCheckList.list[i].status = BConstant.WordState.NotProcessed;
      }
    }

    this.ProcessSpellingMain(spellCheckList, textObj);
    return true;
  }

  /**
   * Checks spelling for all text objects in the document
   * @param callback - Optional callback function to execute after spell checking completes
   */
  CheckAllSpelling(callback) {

    if (!this.GetActive()) {
      this.ClearTextObjects();
      if (callback) callback();
      return;
    }

    const document = this.doc;
    this.inProcessSpellList = [];
    this.inProcessCallback = callback || null;
    this.GetTextList(this.inProcessSpellList, document);
    this.ProcessSpellList();
  }

  /**
   * Clears spell checking information from all text objects in the document
   */
  ClearTextObjects() {

    const document = this.doc;
    const textObjects = [];
    this.GetTextList(textObjects, document);

    for (let i = 0; i < textObjects.length; i++) {
      textObjects[i].textObj.UpdateSpellCheck(null);
    }
  }

  /**
   * Adds a word to the user dictionary
   * @param word - The word to add to the dictionary
   */
  AddWord(word) {
    this.AddToUserDict(word);
  }

  /**
   * Adds a word to the ignore list for the current session
   * @param word - The word to ignore in spell checking
   */
  IgnoreWord(word) {
    T3Util.Log("B.Text.Spell: Ignoring word:", word);

    this.AddWordToCache(word, true);
    if (this.ignoreList.indexOf(word) < 0) {
      this.ignoreList.push(word);
    }

    T3Util.Log("B.Text.Spell: Ignore list size:", this.ignoreList.length);
  }

  /**
   * Gets the current list of words being ignored by the spell checker
   * @returns Array of words being ignored
   */
  GetIgnoreList() {
    T3Util.Log("B.Text.Spell: Getting ignore list, size:", this.ignoreList.length);
    return this.ignoreList;
  }

  /**
   * Sets the list of words to be ignored by the spell checker
   * @param ignoreList - Array of words to ignore
   */
  SetIgnoreList(ignoreList) {
    T3Util.Log("B.Text.Spell: Setting ignore list:", ignoreList);

    this.ignoreList = ignoreList ? ignoreList.slice(0) : [];
    const self = this;

    this.ignoreList.forEach(function (word) {
      self.AddWordToCache(word, true);
    });

    T3Util.Log("B.Text.Spell: Ignore list set with", this.ignoreList.length, "words");
  }

  /**
   * Sets the current dictionary to use for spell checking
   * @param dictionary - Dictionary identifier string
   */
  SetCurrentDictionary(dictionary) {
    T3Util.Log("B.Text.Spell: Setting current dictionary to:", dictionary);

    if (!(dictionary instanceof String)) {
      dictionary = String(dictionary);
    }

    if (!BConstant.DictMap[dictionary]) {
      dictionary = Spell.FindDefaultDictionary();
      T3Util.Log("B.Text.Spell: Invalid dictionary specified, using default:", dictionary);
    }

    this.curDict = dictionary;
    this.ClearCache();

    T3Util.Log("B.Text.Spell: Dictionary set to:", this.curDict);
  }

  /**
   * Gets the current dictionary being used for spell checking
   * @returns String identifier for the current dictionary
   */
  GetCurrentDictionary() {
    T3Util.Log("B.Text.Spell: Getting current dictionary:", this.curDict);
    return this.curDict;
  }

  /**
   * Sets spell checking flags to control behavior
   * @param flags - Bitwise flags controlling spell checker behavior
   */
  SetSpellFlags(flags) {
    T3Util.Log("B.Text.Spell: Setting spell flags:", flags);

    this.bIgnoreAllCaps = (flags & BConstant.SpellFlags.IgnoreAllCaps) != 0;
    this.bIgnoreInitCaps = (flags & BConstant.SpellFlags.IgnoreInitCaps) != 0;
    this.bIgnoreMixedCaps = (flags & BConstant.SpellFlags.IgnoreMixedCase) != 0;
    this.bIgnoreMixedAlphaNum = (flags & BConstant.SpellFlags.IgnoreMixedAlphaNum) != 0;
    this.ClearCache();

    T3Util.Log("B.Text.Spell: Spell flags set, all caps:", this.bIgnoreAllCaps,
      "init caps:", this.bIgnoreInitCaps,
      "mixed caps:", this.bIgnoreMixedCaps,
      "alphanumeric:", this.bIgnoreMixedAlphaNum);
  }

  /**
   * Gets the current spell checking flags
   * @returns Integer with bitwise flags representing current spell checking options
   */
  GetSpellFlags() {
    let flags = 0;

    if (this.bIgnoreAllCaps) {
      flags |= BConstant.SpellFlags.IgnoreAllCaps;
    }

    if (this.bIgnoreInitCaps) {
      flags |= BConstant.SpellFlags.IgnoreInitCaps;
    }

    if (this.bIgnoreMixedCaps) {
      flags |= BConstant.SpellFlags.IgnoreMixedCase;
    }

    if (this.bIgnoreMixedAlphaNum) {
      flags |= BConstant.SpellFlags.IgnoreMixedAlphaNum;
    }

    T3Util.Log("B.Text.Spell: Getting spell flags:", flags);
    return flags;
  }

  /**
   * Shows the spell checking suggestions menu for a specific text position
   * @param textObject - The text object to show suggestions for
   * @param charIndex - The character index where the misspelling is located
   * @param clientX - The X coordinate for menu positioning
   * @param clientY - The Y coordinate for menu positioning
   */
  ShowSpellMenu(textObject, charIndex, clientX, clientY) {
    T3Util.Log("B.Text.Spell: Showing spell menu at position", clientX, clientY,
      "for text object with char index:", charIndex);

    this.spellMenuRequest = {
      textID: textObject.GetInternalID(),
      charIndex: charIndex,
      clientX: clientX,
      clientY: clientY
    };

    if (!this.ProcessSpellMenuRequest(textObject, true)) {
      this.CheckSpellingForTextObj(textObject);
    }

    T3Util.Log("B.Text.Spell: Spell menu request processed");
  }

  /**
   * Loads the user's custom dictionary from the server
   * Makes a request to retrieve custom dictionary data and updates the spell checker
   */
  LoadUserDict() {
    T3Util.Log("B.Text.Spell: Loading user dictionary from server");

    Spell.ServerGetCustomDict((success, dictionaryData) => {
      if (success) {
        T3Util.Log("B.Text.Spell: Successfully retrieved user dictionary");
        T3Gv.docUtil.svgDoc.GetSpellCheck().SetUserDictFromSource(dictionaryData);
      } else {
        T3Util.Log("B.Text.Spell: Failed to retrieve user dictionary");
      }
    });
  }

  /**
   * Sets the user dictionary from source data
   * Parses the source string and initializes the user dictionary and fuzzy matching
   * @param sourceData - String containing user dictionary data
   */
  SetUserDictFromSource(sourceData) {
    T3Util.Log("B.Text.Spell: Setting user dictionary from source data");

    this.userDict = [];

    if (sourceData && sourceData.length) {
      this.userDict = sourceData.split(String.fromCharCode(1));
      T3Util.Log("B.Text.Spell: User dictionary loaded with", this.userDict.length, "words");
    }

    this.AddUserDictToCache();
    this.userSpell = new FuzzySet(this.userDict);

    T3Util.Log("B.Text.Spell: User dictionary initialized with fuzzy matching");
  }

  /**
   * Saves the user dictionary to the server
   * Serializes the dictionary and sends it for server-side storage
   */
  SaveUserDict() {
    T3Util.Log("B.Text.Spell: Saving user dictionary to server");

    const dictionaryString = this.userDict.join(String.fromCharCode(1));
    const serializedData = JSON.stringify(dictionaryString);

    Spell.ServerStoreCustomDict(serializedData, (success) => {
      if (success) {
        T3Util.Log("B.Text.Spell: User dictionary saved successfully");
      } else {
        T3Util.Log("B.Text.Spell: Failed to save user dictionary");
      }
    });
  }

  /**
   * Adds all user dictionary words to the word cache
   * Ensures all user dictionary words are marked as correct in the cache
   */
  AddUserDictToCache() {
    T3Util.Log("B.Text.Spell: Adding", this.userDict.length, "user dictionary words to cache");

    for (let i = 0; i < this.userDict.length; i++) {
      this.AddWordToCache(this.userDict[i], true);
    }

    T3Util.Log("B.Text.Spell: User dictionary words added to cache");
  }

  /**
   * Adds a word to the user dictionary
   * Updates the cache, saves the dictionary, and refreshes the fuzzy matching set
   * @param word - The word to add to the user dictionary
   */
  AddToUserDict(word) {
    T3Util.Log("B.Text.Spell: Adding word to user dictionary:", word);

    this.AddWordToCache(word, true);

    if (this.userDict.indexOf(word) < 0) {
      this.userDict.push(word);
      this.userDict.sort((a, b) => {
        return a.localeCompare(b);
      });

      this.userSpell = new FuzzySet(this.userDict);
      this.SaveUserDict();

      T3Util.Log("B.Text.Spell: Word added to user dictionary and dictionary saved");
    } else {
      T3Util.Log("B.Text.Spell: Word already exists in user dictionary");
    }
  }

  /**
   * Removes a word from the user dictionary
   * Clears the word from cache, updates the dictionary, and saves changes
   * @param word - The word to remove from the user dictionary
   */
  RemoveFromUserDict(word) {
    T3Util.Log("B.Text.Spell: Removing word from user dictionary:", word);

    const wordIndex = this.userDict.indexOf(word);

    if (wordIndex >= 0) {
      this.wordCache[word] = undefined;
      this.userDict.splice(wordIndex, 1);
      this.userSpell = new FuzzySet(this.userDict);
      this.SaveUserDict();

      T3Util.Log("B.Text.Spell: Word removed from user dictionary");
    } else {
      T3Util.Log("B.Text.Spell: Word not found in user dictionary");
    }
  }

  /**
   * Clears the entire user dictionary
   * Removes all words from the cache and dictionary, then saves the empty dictionary
   */
  ClearUserDict() {
    T3Util.Log("B.Text.Spell: Clearing entire user dictionary");

    for (let i = 0; i < this.userDict.length; i++) {
      const word = this.userDict[i];
      this.wordCache[word] = undefined;
    }

    this.userDict = [];
    this.userSpell = new FuzzySet(this.userDict);
    this.SaveUserDict();

    T3Util.Log("B.Text.Spell: User dictionary cleared");
  }

  /**
   * Gets spelling suggestions from the user's custom dictionary
   * Uses fuzzy matching to find similar words in the user dictionary
   * @param word - The word to find suggestions for
   * @returns Array of suggested words from the user dictionary
   */
  GetUserDictSuggestions(word) {
    T3Util.Log("B.Text.Spell: Getting user dictionary suggestions for:", word);

    const suggestions = [];
    let matches = null;

    if (this.userSpell) {
      matches = this.userSpell.get(word);
    }

    if (!matches || !matches.length) {
      T3Util.Log("B.Text.Spell: No user dictionary suggestions found");
      return [];
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      if (match.length === 2 && match[0] > 0.4) {
        suggestions.push(match[1]);
      }
    }

    T3Util.Log("B.Text.Spell: Found", suggestions.length, "user dictionary suggestions");
    return suggestions;
  }

  /**
   * Processes a request to show the spell check suggestion menu
   * Verifies the request is valid and loads suggestions for the misspelled word
   *
   * @param textObject - The text object containing the misspelled word
   * @param keepRequest - Whether to keep the menu request after processing
   * @returns Boolean indicating if the request was processed successfully
   */
  ProcessSpellMenuRequest(textObject, keepRequest) {
    T3Util.Log("B.Text.Spell: Processing spell menu request for text object", textObject?.GetInternalID());

    if (!this.spellMenuRequest || !textObject) {
      T3Util.Log("B.Text.Spell: No spell menu request or text object, returning false");
      return false;
    }

    const targetTextObject = this.FindTextObj(this.spellMenuRequest.textID);
    const charIndex = this.spellMenuRequest.charIndex;
    const clientX = this.spellMenuRequest.clientX;
    const clientY = this.spellMenuRequest.clientY;

    if (!keepRequest) {
      this.spellMenuRequest = null;
    }

    if (!targetTextObject || targetTextObject.GetInternalID() != textObject.GetInternalID()) {
      T3Util.Log("B.Text.Spell: Text object not found or doesn't match request, returning false");
      return false;
    }

    const spellCheckList = textObject.GetSpellCheckList();
    const textID = targetTextObject.GetInternalID();
    const wordIndex = this.FindWordInWordList(spellCheckList, charIndex);

    if (wordIndex < 0 || spellCheckList.list[wordIndex].status == BConstant.WordState.NotProcessed) {
      T3Util.Log("B.Text.Spell: Word not found or not processed yet, returning false");
      return false;
    }

    const self = this;
    this.LoadCacheSuggest(spellCheckList.list[wordIndex].word, (success, suggestions) => {
      if (success) {
        T3Util.Log("B.Text.Spell: Successfully loaded suggestions for word");
        spellCheckList.list[wordIndex].suggestions = suggestions;
        self.ProcessSpellMenu(textID, spellCheckList, wordIndex, clientX, clientY);
        self.spellMenuRequest = null;
      }
    });

    T3Util.Log("B.Text.Spell: Spell menu request processed successfully");
    return true;
  }

  /**
   * Processes and displays the spell check menu with suggestions
   * Prepares the spelling suggestion data and displays the contextual menu
   *
   * @param textID - The ID of the text object
   * @param spellCheckList - The list of words to check spelling for
   * @param wordIndex - The index of the misspelled word in the list
   * @param clientX - The X coordinate for menu positioning
   * @param clientY - The Y coordinate for menu positioning
   */
  ProcessSpellMenu(textID, spellCheckList, wordIndex, clientX, clientY) {
    T3Util.Log("B.Text.Spell: Processing spell menu for text", textID, "at word index", wordIndex);

    if (wordIndex < 0 || wordIndex >= spellCheckList.list.length ||
      spellCheckList.list[wordIndex].status != BConstant.WordState.Wrong) {
      T3Util.Log("B.Text.Spell: Invalid word index or word is not misspelled");
      return;
    }

    this.spellMenuData = {
      wordInfo: $.extend(true, {}, spellCheckList.list[wordIndex]),
      textID: textID
    };

    if (!this.spellMenuData.wordInfo.suggestions) {
      this.spellMenuData.wordInfo.suggestions = [];
    }

    // Add user dictionary suggestions
    const userSuggestions = this.GetUserDictSuggestions(this.spellMenuData.wordInfo.word);
    if (userSuggestions && userSuggestions.length) {
      this.spellMenuData.wordInfo.suggestions = userSuggestions.concat(this.spellMenuData.wordInfo.suggestions);
    }

    // Handle capitalization for suggestions
    if (this.IsInitUpper(this.spellMenuData.wordInfo.word)) {
      const suggestionCount = this.spellMenuData.wordInfo.suggestions.length;
      for (let i = 0; i < suggestionCount; i++) {
        if (this.IsAllLower(this.spellMenuData.wordInfo.suggestions[i])) {
          this.spellMenuData.wordInfo.suggestions[i] = this.MakeInitUpper(this.spellMenuData.wordInfo.suggestions[i]);
        }
      }
    }

    T3Util.Log("B.Text.Spell: Showing contextual menu with", this.spellMenuData.wordInfo.suggestions.length, "suggestions");
  }

  /**
   * Adds the currently selected misspelled word to the user dictionary
   * When a user selects "Add to Dictionary" from the spell check menu,
   * this function adds the word to the user dictionary
   */
  HandleMenuAdd() {
    T3Util.Log("B.Text.Spell: Handling menu 'Add to Dictionary' action");

    if (this.spellMenuData) {
      const word = this.spellMenuData.wordInfo.word;
      T3Util.Log("B.Text.Spell: Adding word to dictionary:", word);

      const textObject = this.FindTextObj(this.spellMenuData.textID);
      if (textObject) {
        this.AddWord(word);
      }

      this.spellMenuData = null;
      T3Util.Log("B.Text.Spell: Word added to dictionary and menu data cleared");
    }
  }

  /**
   * Ignores the currently selected misspelled word for the current session
   * When a user selects "Ignore" from the spell check menu,
   * this function adds the word to the ignore list
   */
  HandleMenuIgnore() {
    T3Util.Log("B.Text.Spell: Handling menu 'Ignore' action");

    if (this.spellMenuData) {
      const word = this.spellMenuData.wordInfo.word;
      T3Util.Log("B.Text.Spell: Ignoring word:", word);

      const textObject = this.FindTextObj(this.spellMenuData.textID);
      if (textObject) {
        this.IgnoreWord(word);
      }

      this.spellMenuData = null;
      T3Util.Log("B.Text.Spell: Word added to ignore list and menu data cleared");
    }
  }

  /**
   * Replaces the misspelled word with a selected suggestion
   * When a user selects a suggestion from the spell check menu,
   * this function replaces the misspelled word with the suggestion
   *
   * @param suggestionIndex - The index of the selected suggestion in the suggestions array
   */
  HandleMenuSuggest(suggestionIndex) {

    if (
      !this.spellMenuData ||
      !this.spellMenuData.wordInfo.suggestions ||
      suggestionIndex < 0 ||
      suggestionIndex >= this.spellMenuData.wordInfo.suggestions.length
    ) {
      return;
    }

    const suggestion = this.spellMenuData.wordInfo.suggestions[suggestionIndex];
    const startPosition = this.spellMenuData.wordInfo.start;
    const endPosition = this.spellMenuData.wordInfo.end;
    const textObject = this.FindTextObj(this.spellMenuData.textID);


    // Preserve capitalization if needed
    let finalSuggestion = suggestion;
    if (this.IsAllLower(suggestion) && this.IsInitUpper(this.spellMenuData.wordInfo.word)) {
      finalSuggestion = this.MakeInitUpper(suggestion);
    }

    if (textObject) {
      textObject.SetSelectedRange(startPosition, endPosition);
      textObject.Paste(finalSuggestion, false);
    }

    this.spellMenuData = null;
  }

  /**
   * Gets the list of spelling suggestions for the current menu
   * Returns the suggestions for the misspelled word that the menu is displayed for
   *
   * @returns Array of spelling suggestions or null if no menu data is available
   */
  GetMenuSuggestions() {

    if (this.spellMenuData && this.spellMenuData.wordInfo.suggestions) {
      return this.spellMenuData.wordInfo.suggestions;
    }

    return null;
  }

  /**
   * Collects all spell-checkable text objects from the document
   * Recursively searches through all elements in the document and collects
   * text objects that have spell checking enabled
   *
   * @param textList - Array to populate with text objects
   * @param container - The document or container element to search within
   */
  GetTextList(textList, container) {

    const elementCount = container.ElementCount();

    for (let elementIndex = 0; elementIndex < elementCount; elementIndex++) {
      const element = container.GetElementByIndex(elementIndex);

      if (element instanceof Text && element.GetSpellCheck()) {
        textList.push({
          id: element.GetInternalID(),
          textObj: element
        });
      } else if (element instanceof Instance.Basic.Group || element instanceof Instance.Basic.Layer) {
        this.GetTextList(textList, element);
      }
    }
  }

  /**
   * Processes the spell check list of text objects
   * Checks each text object in the queue and processes their spelling
   * Calls the callback when complete
   */
  ProcessSpellList() {

    // If list is empty, clean up and call callback
    if (this.inProcessSpellList && !this.inProcessSpellList.length) {
      this.inProcessSpellList = null;

      if (this.inProcessCallback) {
        this.inProcessCallback();
        this.inProcessCallback = null;
      }
    }

    // If we still have a spell list to process
    if (this.inProcessSpellList) {
      this.inAsyncSpellCheck = true;

      const textObjectInfo = this.inProcessSpellList.pop();
      const textObject = this.FindTextObj(textObjectInfo.id);


      if (!(textObject && this.CheckSpellingForTextObj(textObject, true))) {
        // If this object couldn't be checked, move to the next one
        this.ProcessSpellList();
      }
    } else {
      this.inAsyncSpellCheck = false;
    }
  }

  /**
   * Schedules spell list processing asynchronously
   * Uses setTimeout to avoid blocking the UI thread
   */
  AsyncProcessSpellList() {

    const self = this;
    setTimeout(function () {
      self.ProcessSpellList();
    }, 1);
  }

  /**
   * Retrieves a word's spell check data from the cache
   * @param word - The word to look up in the cache
   * @returns Object containing the word's spell check data or null if not found
   */
  GetWordFromCache(word) {

    const cacheEntry = this.wordCache[word];

    if (cacheEntry && typeof cacheEntry !== "function") {
      return cacheEntry;
    }

    return null;
  }

  /**
   * Loads spelling suggestions for a word
   * Returns suggestions from cache or fetches them from the server
   *
   * @param word - The word to get suggestions for
   * @param callback - Callback function that receives suggestions
   */
  LoadCacheSuggest(word, callback) {

    const cacheEntry = this.GetWordFromCache(word);

    if (cacheEntry) {
      if (cacheEntry.needSuggest) {

        Spell.ProcessGetSuggest(word, this.curDict, function (success, suggestions) {
          if (success) {
            cacheEntry.suggest = suggestions;
            cacheEntry.needSuggest = false;

            if (callback) {
              callback(true, cacheEntry.suggest);
            }
          } else if (callback) {
            callback(false);
          }
        });
      } else {

        if (callback) {
          callback(true, cacheEntry.suggest);
        }
      }
    } else if (callback) {
      callback(false);
    }
  }

  /**
   * Adds a word to the spell checker's cache with its status information
   * Stores whether a word is correct and any available spelling suggestions
   *
   * @param word - The word to add to the cache
   * @param isCorrect - Boolean indicating if the word is spelled correctly
   * @param suggestions - Array of spelling suggestions (optional)
   * @param autoCorrect - Boolean indicating if the word can be auto-corrected
   */
  AddWordToCache(word, isCorrect, suggestions?, autoCorrect?) {

    const suggestionsList = suggestions || [];
    const needsSuggestions = !suggestions && !isCorrect;

    this.wordCache[word] = {
      check: isCorrect,
      suggest: suggestionsList,
      auto: autoCorrect,
      needSuggest: needsSuggestions
    };
  }

  /**
   * Clears the word cache and rebuilds it with user dictionary words
   * Resets the cache to remove any accumulated spell check data
   */
  ClearCache() {
    this.wordCache = {};
    this.AddUserDictToCache();
  }

  /**
   * Main entry point for processing spelling in a text object
   * Determines whether to process spelling locally or remotely
   *
   * @param spellCheckList - The list of words to check spelling for
   * @param textObject - The text object being spell checked
   */
  ProcessSpellingMain(spellCheckList, textObject) {

    if (this.ProcessSpellingLocal(spellCheckList, textObject, false)) {
      this.AsyncProcessSpellList();
      this.ProcessSpellMenuRequest(textObject, false);
      T3Util.Log("B.Text.Spell: Spelling processed locally");
    } else {
      this.ProcessSpellingRemote(spellCheckList, 0);
    }
  }

  /**
   * Processes spelling using the local word cache
   * Checks each word against the cache and applies spelling rules
   *
   * @param spellCheckList - The list of words to check spelling for
   * @param textObject - The text object being spell checked
   * @param skipUpdateIfIncomplete - Whether to skip updating the text object if not all words were processed
   * @returns Boolean indicating if all words were successfully processed locally
   */
  ProcessSpellingLocal(spellCheckList, textObject, skipUpdateIfIncomplete) {

    let allWordsProcessed = true;
    let anyWordsProcessed = false;
    const wordCount = spellCheckList.list.length;

    for (let wordIndex = 0; wordIndex < wordCount; wordIndex++) {
      if (spellCheckList.list[wordIndex].status === BConstant.WordState.NotProcessed) {
        const word = spellCheckList.list[wordIndex].word;
        const cacheEntry = this.GetWordFromCache(word);

        if (cacheEntry) {
          // Word found in cache
          spellCheckList.list[wordIndex].status = cacheEntry.check ?
            BConstant.WordState.Correct : BConstant.WordState.Wrong;
          spellCheckList.list[wordIndex].suggestions = cacheEntry.suggest;
          spellCheckList.list[wordIndex].needSuggest = cacheEntry.needSuggest;
          spellCheckList.list[wordIndex].auto = cacheEntry.auto;
          anyWordsProcessed = true;
        } else if (word.length > BConstant.Globals.MaxWordSize) {
          // Word too long, mark as incorrect
          this.AddWordToCache(word, false);
          spellCheckList.list[wordIndex].status = BConstant.WordState.Wrong;
          spellCheckList.list[wordIndex].needSuggest = false;
          spellCheckList.list[wordIndex].suggestions = [];
          anyWordsProcessed = true;
        } else if (
          (this.bIgnoreAllCaps && this.IsAllUpper(word)) ||
          (this.bIgnoreInitCaps && this.IsInitUpper(word)) ||
          (this.bIgnoreMixedAlphaNum && this.HasNumber(word))
        ) {
          // Word matches one of the ignore rules, mark as correct
          spellCheckList.list[wordIndex].status = BConstant.WordState.Correct;
          spellCheckList.list[wordIndex].needSuggest = false;
          spellCheckList.list[wordIndex].suggestions = [];
          anyWordsProcessed = true;
        } else {
          // Word needs remote checking
          allWordsProcessed = false;
        }
      }
    }

    if (textObject && anyWordsProcessed && (!skipUpdateIfIncomplete || allWordsProcessed)) {
      textObject.UpdateSpellCheck(spellCheckList);
    }

    return allWordsProcessed;
  }

  /**
   * Processes spelling checking by sending words to a remote server
   * Collects unprocessed words from the spell check list and sends them in batches
   * to avoid exceeding server size limits
   *
   * @param spellCheckList - The list of words to check spelling for
   * @param startIndex - The index to start processing from in the list
   */
  ProcessSpellingRemote(spellCheckList, startIndex) {

    const wordList = [];
    let totalLength = 0;
    let nextStartIndex = 0;
    const self = this;
    const totalWords = spellCheckList.list.length;

    for (let wordIndex = startIndex; wordIndex < totalWords; wordIndex++) {
      if (
        spellCheckList.list[wordIndex].status == BConstant.WordState.NotProcessed &&
        wordList.indexOf(spellCheckList.list[wordIndex].word) < 0
      ) {
        totalLength += spellCheckList.list[wordIndex].word.length + 1;

        if (
          wordList.length &&
          totalLength > BConstant.Globals.MaxServerListSize
        ) {
          nextStartIndex = wordIndex;
          break;
        }

        wordList.push(spellCheckList.list[wordIndex].word);
      }
    }

    if (wordList.length) {
      this.inAsyncSpellCheck = true;

    } else {
      this.AsyncProcessSpellList();
    }
  }

  /**
   * Finds a text object by its internal ID
   * Recursively searches through a container to find a text object with matching ID
   *
   * @param textId - The internal ID of the text object to find
   * @param container - The container to search in (defaults to this.doc)
   * @returns The found text object or null if not found
   */
  FindTextObj(textId, container?) {

    container = container || this.doc;

    const elementCount = container.ElementCount();

    for (let elementIndex = 0; elementIndex < elementCount; elementIndex++) {
      const element = container.GetElementByIndex(elementIndex);

      if (element instanceof Text) {
        if (element.GetInternalID() == textId) {
          return element;
        }
      } else if (element instanceof Instance.Basic.Group || element instanceof Instance.Basic.Layer) {
        const foundObject = this.FindTextObj(textId, element);
        if (foundObject) {
          return foundObject;
        }
      }
    }

    return null;
  }

  /**
   * Finds a word in a word list based on character index
   * Determines which word contains the specified character position
   *
   * @param wordList - The list of words to search in
   * @param charIndex - The character index to find the word for
   * @returns The index of the word in the list, or -1 if not found
   */
  FindWordInWordList(wordList, charIndex) {

    const listLength = wordList ? wordList.list.length : 0;

    for (let wordIndex = 0; wordIndex < listLength; wordIndex++) {
      if (charIndex >= wordList.list[wordIndex].start && charIndex < wordList.list[wordIndex].end) {
        return wordIndex;
      }
    }

    return -1;
  }

  /**
   * Checks if a word is all uppercase
   * Determines if a string consists entirely of uppercase characters
   *
   * @param word - The word to check
   * @returns Boolean indicating if the word is all uppercase
   */
  IsAllUpper(word) {
    const result = word == word.toUpperCase();
    return result;
  }

  /**
   * Checks if a word is all lowercase
   * Determines if a string consists entirely of lowercase characters
   *
   * @param word - The word to check
   * @returns Boolean indicating if the word is all lowercase
   */
  IsAllLower(word) {
    const result = word == word.toLowerCase();
    return result;
  }

  /**
   * Checks if a word has initial uppercase formatting
   * Determines if a string starts with an uppercase letter followed by lowercase letters
   *
   * @param word - The word to check
   * @returns Boolean indicating if the word has initial uppercase formatting
   */
  IsInitUpper(word) {
    const result = word == this.MakeInitUpper(word);
    return result;
  }

  /**
   * Checks if a word contains numeric characters
   * Determines if a string contains at least one digit (0-9)
   *
   * @param word - The word to check
   * @returns Boolean indicating if the word contains numbers
   */
  HasNumber(word) {
    const result = word.search(/\d/) >= 0;
    return result;
  }

  /**
   * Makes the first letter of a string uppercase and the rest lowercase
   * @param word - The string to transform
   * @returns The transformed string with initial capital letter
   */
  MakeInitUpper(word) {
    const result = word.length ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word;
    return result;
  }

  /**
   * Finds the default dictionary based on browser's language settings
   * Attempts to match the full locale (e.g., 'en-us') first, then falls back
   * to the base language code (e.g., 'en') if a full match isn't found
   * @returns The dictionary code matching the browser's language or 'en' as fallback
   */
  static FindDefaultDictionary() {

    let languageCode;
    let defaultLanguage = 'en';
    let dictionaryMatch = null;

    if (navigator && navigator.language && navigator.language.length) {
      defaultLanguage = navigator.language.toLowerCase();
    }

    languageCode = defaultLanguage.substr(0, 2);

    if (BConstant.DictMap[defaultLanguage]) {
      dictionaryMatch = defaultLanguage;
    }

    if (!dictionaryMatch && BConstant.DictMap[languageCode]) {
      dictionaryMatch = languageCode;
    }

    if (!dictionaryMatch) {
      dictionaryMatch = 'en';
    }

    return dictionaryMatch;
  }
}

export default Spell
