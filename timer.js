// Copyright (c) 2026 Brian Kircher
//
// Open Source Software: you can modify and/or share it under the terms of the
// BSD license file in the root directory of this proect.

// Tracks the timer run state.
let running = false;

// Tracks the timer being complete.
let done = false;

// The ID of the javascript timer used to periodicially update the display.
let timerId = -1;

// The time (in milliseconds) at which the timer was started.
let startTime;

// The state of the reset button.
var resetState = true;

// The ID of the javascript timer used to de-activate the reset button when it
// is pressed while the timer is running.
var resetTimerId = -1;

// The stack of dialogs that are open.
let dialogStack = [];

// The list of registered event handlers.
var events = new Map();

// Adapted from ios-pwa-splash <https://github.com/avadhesh18/iosPWASplash>
function
iosPWASplash(icon, color = "white")
{
  // Check if the provided 'icon' is a valid URL
  if((typeof icon !== "string") || (icon.length === 0))
  {
    throw new Error("Invalid icon URL provided");
  }

  // Calculate the device's width and height
  const deviceWidth = screen.width;
  const deviceHeight = screen.height;

  // Calculate the pixel ratio
  const pixelRatio = window.devicePixelRatio || 1;

  // Create two canvases and get their contexts to draw landscape and portrait
  // splash screens.
  const canvas = document.createElement("canvas");
  const canvas2 = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const ctx2 = canvas2.getContext("2d");

  // Create an image element for the icon
  const iconImage = new Image();

  iconImage.onerror = function ()
  {
    throw new Error("Failed to load icon image");
  };

  iconImage.src = icon;

  // Load the icon image.
  iconImage.onload = function ()
  {
    // Calculate the icon size based on the device's screen size.
    const min = Math.min(deviceWidth, deviceHeight) * pixelRatio;
    const iconSizew = (min * 3) / 5;
    const iconSizeh = (min * 3) / 5;

    canvas.width = deviceWidth * pixelRatio;
    canvas2.height = canvas.width;
    canvas.height = deviceHeight * pixelRatio;
    canvas2.width = canvas.height;
    ctx.fillStyle = color;
    ctx2.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx2.fillRect(0, 0, canvas2.width, canvas2.height);

    // Calculate the position to center the icon
    const x = (canvas.width - iconSizew) / 2;
    const y = (canvas.height - iconSizeh) / 2;
    const x2 = (canvas2.width - iconSizew) / 2;
    const y2 = (canvas2.height - iconSizeh) / 2;

    // Draw the icon with the calculated size
    ctx.drawImage(iconImage, x, y, iconSizew, iconSizeh);
    ctx2.drawImage(iconImage, x2, y2, iconSizew, iconSizeh);
    const imageDataURL = canvas.toDataURL("image/png");
    const imageDataURL2 = canvas2.toDataURL("image/png");

    // Create the first startup image <link> tag (splash screen)
    const link = document.createElement("link");
    link.setAttribute("rel", "apple-touch-startup-image");
    link.setAttribute("media", "screen and (orientation: portrait)");
    link.setAttribute("href", imageDataURL);
    document.head.appendChild(link);

    // Create the second startup image <link> tag (splash screen)
    const link2 = document.createElement("link");
    link2.setAttribute("rel", "apple-touch-startup-image");
    link2.setAttribute("media", "screen and (orientation: landscape)");
    link2.setAttribute("href", imageDataURL2);
    document.head.appendChild(link2);
  };
}

// Adds an event handler to an element.
function
addEvent(element, event, handler)
{
  // Save this event handler in the list of event handlers for this element.
  if(!events.has(element))
  {
    events.set(element, new Map());
  }
  if(!events.get(element).has(event))
  {
    events.get(element).set(event, []);
  }
  events.get(element).get(event).push(handler);

  // Add the event handler to the element.
  element.addEventListener(event, handler);
}

// Rmeoves the event handlers from an element.
function
removeEvent(element, event)
{
  // Do nothing if there are no registered event handler for this element or
  // event.
  if(!events.has(element))
  {
    return;
  }
  if(!events.get(element).has(event))
  {
    return;
  }

  // Loop through the handlers for this event, removing them.
  eventList = events.get(element).get(event);
  for(let idx = 0; idx < eventList.length; idx++)
  {
    element.removeEventListener(event, eventList[idx]);
  }

  // Delete the list of event handlers, and the element if it no longer has
  // any registered events.
  events.get(element).delete(event);
  if(events.get(element).size == 0)
  {
    events.delete(element);
  }
}

// Shows a dialog.
function
showDialog(dialog, buttons = [])
{
  // Create an return a promise that is resolved when the dialog is closed.
  return(new Promise((resolve) =>
  {
    // Called when the dialog hide animation completes.
    function
    closeEnd(result)
    {
      // Remove the hide class (preparing the dialog for the next time it is
      // displayed).
      dialog.classList.remove("hide");

      // Close the modal dialog.
      dialog.close();

      // Remove the end of animation event listener.
      removeEvent(dialog, "animationend");

      // Remove this dialog from the stack.
      dialogStack.pop();

      // Remove the keydown event listener.
      removeEvent(document, "keydown");

      // Resolve the promise with the result of the dialog.
      resolve(result);
    }

    // Called when the dialog should be closed.
    function
    close(result)
    {
      // Add an end of animation event listener.
      addEvent(dialog, "animationend", () => closeEnd(result));

      // Add the hide class to the dialog, starting the close animation.
      dialog.classList.add("hide");
    }

    // Called when there is a click (mouse or touch).
    function
    click(e)
    {
      const rect = e.target.getBoundingClientRect();

      // See if the click is outside the dialog box.
      if((rect.left > e.clientX) || (rect.right < e.clientX) ||
         (rect.top > e.clientY) || (rect.bottom < e.clientY))
      {
        // Close the dialog.
        close(-1);
      }
    }

    // Called when a key is pressed.
    function
    keyDown(e)
    {
      // Close the dialog if the escape key is pressed.
      if((e.key == "Escape") &&
         (dialogStack[dialogStack.length - 1] == dialog))
      {
        // Start the animated close of the dialog.
        close(-1);

        // Prevent any further handling of this keystroke.
        e.preventDefault();
      }
    }

    // Loop through the buttons in the dialog.
    for(let idx = 0; idx < buttons.length; idx++)
    {
      // Add the click handler to this button.
      let button = dialog.querySelector(`#${buttons[idx][0]}`);
      removeEvent(button, "click");
      addEvent(button, "click", () => close(buttons[idx][1]));
    }

    // Register the click handler for the backdrop.
    removeEvent(dialog, "click");
    addEvent(dialog, "click", click);

    // Add a keydown listener to the document to override the default Escape
    // key handling for a modal dialog (which simply closes it, instead of
    // animating the close like needed here).
    addEvent(document, "keydown", keyDown);

    // Add this dialog to the dialog stack.
    dialogStack.push(dialog);

    // Show the dialog.
    dialog.showModal();

    // Scroll to the top of the dialog.
    dialog.scrollTo(0, 0);
  }));
}

// Shows the about dialog.
function
showAbout()
{
  // Get the about dialog element.
  const dialog = document.querySelector("#about");

  // Show the about dialog.
  showDialog(dialog, [ [ "ok", 0 ]]);
}

// Shows a license dialog.
function
showLicense()
{
  // Get the licnese dialog element.
  const license = document.querySelector("#license");

  // Show the license dialog.
  showDialog(license, [ [ "ok", 0 ]]);
}

// Shows installation instructions for iOS.
function
showIOS()
{
  // Get the iOS installation dialog element.
  const dialog = document.querySelector("#ios_install");

  // Show the dialog.
  showDialog(dialog, [ [ "ok", 0 ]]);
}

// Shows installation instructions for Android.
function
showAndroid()
{
  // Get the Android installation dialog element.
  const dialog = document.querySelector("#android_install");

  // Show the dialog.
  showDialog(dialog, [ [ "ok", 0 ]]);
}

// Updates the display.
function
render()
{
  let count;

  // Get references to the elements of interest.
  let progress_bar = document.querySelector("#progress-bar");
  let progress = progress_bar.querySelector("progress");
  let reset = document.querySelector("#reset");
  let stage = document.querySelector("#stage");
  let time = document.querySelector("#time");

  // See if the timer is still running.
  if(running && !done)
  {
    // Compute the amount of time left on the timer.
    count = 180 - ((Date.now() - startTime) / 1000);
    if(count < 0)
    {
      // The timer has expired, so reset it.
      count = 0;
      clearTimeout(timerId);
      resetTimeout(0);
      reset.querySelector("button").style.backgroundColor =
        "var(--color-reset-armed)";
      running = false;
      done = true;
    }
  }
  else if(done)
  {
    // The time left on the timer is zero if the timer is done.
    count = 0;
  }
  else
  {
    // The time left on the timer is 3 minutes if the timer is reset and not
    // started.
    count = 180;
  }

  // Compute the percentage of the circular progress bar that is still visible.
  let percentage = 100 - ((100 * count) / 180);

  // Set the gradient on the circular progress bar based on the percentage that
  // is still visible.
  let gradient = "";
  if(count == 0)
  {
    gradient = "var(--color-gray)";
  }
  else if(count <= 15)
  {
    gradient = "var(--color-gray) " + percentage + "%, var(--color-warning) 0";
  }
  else if(count <= 120)
  {
    gradient = "var(--color-gray) " + percentage + "%, var(--color-setup) " +
               percentage + "%, var(--color-setup) 0";
  }
  else
  {
    gradient = "var(--color-gray) " + percentage + "%, " +
               "var(--color-inspection) " + percentage + "%, " +
               "var(--color-inspection) 33.33333%, var(--color-setup) " +
               "33.33333%, var(--color-setup) 0";
  }
  progress_bar.style.setProperty("--gradient", gradient);

  // Set the value of the progress bar, for use by screen readers.
  progress.value = Math.trunc(count);
  progress.innerHTML = Math.trunc(count);

  // Convert the time left into minutes and seconds.
  let minute = Math.trunc(Math.ceil(count) / 60);
  let second = String(Math.trunc(Math.ceil(count) % 60)).padStart(2, "0");
  let color;

  // See if the time has expired.
  if(count == 0)
  {
    // Set the message and time.
    stage.innerHTML = "Ready!";
    time.innerHTML = "0:00";
    time.style.display = "unset";

    // Select the color for the background shadow.
    color = "var(--color-setup)";
  }

  // See if the time is during the setup period.
  else if(count <= 120)
  {
    // Set the stage and the time.
    stage.innerHTML = "Setup";
    time.innerHTML = "" + minute + ":" + second;
    time.style.display = "unset";

    // Select the color for the background shadow.
    if(count <= 15)
    {
      color = "var(--color-warning)";
    }
    else
    {
      color = "var(--color-setup)";
    }
  }
  else
  {
    // Set the stage based on if the timer is running.
    if(!running)
    {
      stage.innerHTML = "Welcome!";
      time.style.display = "hidden";
    }
    else
    {
      stage.innerHTML = "Inspection";
      time.style.display = "unset";
    }

    // Set the time.
    time.innerHTML = "" + (minute - 2) + ":" + second;

    // Select the color for the background shadow.
    color = "var(--color-inspection)";
  }

  // Set the text shadow with the selected color.
  color = color + " 5px 5px 10px, " + color + " 5px -5px 10px, " + color +
                  " -5px -5px 10px, " + color + " -5px 5px 10px";
  time.style.textShadow = color;
  stage.style.textShadow = color;
}

// Called every 100ms to update the display when the timer is running.
function
tick()
{
  // Re-schedule the timer.
  timerId = setTimeout(tick, 100);

  // Update the display.
  render();
}

// Called when the start button is pressed.
function
start()
{
  // Do nothing if the timer is running.
  if(running)
  {
    return;
  }

  // Get the start time for the timer.
  startTime = Date.now();

  // Mark the timer as running and not done.
  running = true;
  done = false;

  // Schedule a timer to re-render the timer.
  timerId = setTimeout(tick, 100);

  // Reset the reset button.
  resetTimeout(0);

  // Render the timer.
  render();
}

// Resets the reset button.
function
resetTimeout(event)
{
  // Set the background color of the reset button to the disarmed state.
  document.querySelector("#reset button").style.backgroundColor =
    "var(--color-reset)";

  // Disarm the reset button.
  resetState = true;

  // See if there is a timer for automatically disarming the reset button.
  if(resetTimerId != -1)
  {
    // Stop the timer.
    clearTimeout(resetTimerId);

    // Clear the timer ID.
    resetTimerId = -1;
  }
}

// Called when the reset button is pressed.
function
reset()
{
  // See if the timer is running and the reset button is not armed.
  if(running & resetState)
  {
    // Change the background color of the reset button to indicate that it is
    // armed.
    document.querySelector("#reset button").style.backgroundColor =
      "var(--color-reset-armed)";

    // Arm the reset button.
    resetState = false;

    // Start the timer to automatically disarm the reset button after a short
    // period of time.
    resetTimerId = setTimeout(resetTimeout, 1000);

    // There is nothing else to do to handle this button press.
    return;
  }

  // See if the reset button is armed.
  if(!resetState)
  {
    // Disarm the reset button.
    resetTimeout(0);
  }

  // See if the timer is running.
  if(running)
  {
    // Stop the javascript timer for the timer.
    clearTimeout(timerId);

    // Mark the timer as not running.
    running = false;
  }

  // The timer is no longer done.
  done = false;

  // Set the background color of the reset button to the disarmed state.
  document.querySelector("#reset button").style.backgroundColor =
    "var(--color-reset)";

  // Re-render the timer.
  render();
}

// This function is called when the window gains focus.
function
onFocus(event)
{
  // Re-render the display, making sure it is up to date (which is not the case
  // when the window loses focus for a while when the timer is running).
  render();
}

// This function is called when the window is resized (and, in the mobile case,
// when the orientation of the screen changes).
function
onResize(event)
{
  // Get references to the elements of interest.
  let timer = document.querySelector("#timer");
  let div = document.querySelector("#progress-bar");
  let time = document.querySelector("#time");
  let stage = document.querySelector("#stage");
  let start = document.querySelector("#start");
  let startButton = start.querySelector("button");
  let resetButton = document.querySelector("#reset button");

  // See if the display is in a landscape or portrait orientation.
  if(timer.clientWidth < timer.clientHeight)
  {
    // The display is in a portrait orientation, so set the width and height
    // of the progress bar to the width of the timer div (ensuring that it is
    // square).
    div.style.width = timer.clientWidth + "px";
    div.style.height = timer.clientWidth + "px";

    // Set the font size of the text inside the progress bar based on the width
    // of the timer div.
    time.style.fontSize = (timer.clientWidth / 8) + "px";
    stage.style.fontSize = (timer.clientWidth / 8) + "px";
  }
  else
  {
    // The display is in landscape orientation, so set the width and height of
    // the progress bar to the height of the timer div (ensuring that it is
    // square).
    div.style.width = timer.clientHeight + "px";
    div.style.height = timer.clientHeight + "px";

    // Set the font size of the text inside the progress bar based on the
    // height of the timer div.
    time.style.fontSize = (timer.clientHeight / 8) + "px";
    stage.style.fontSize = (timer.clientHeight / 8) + "px";
  }

  // Set the text size and border radius of the start and reset buttons based
  // on the height of their containing div (the start div is used for both
  // since the CSS ensures that both are the same size).
  startButton.style.fontSize = (start.clientHeight / 8) + "px";
  startButton.style.borderRadius = (start.clientHeight / 8) + "px";
  resetButton.style.fontSize = (start.clientHeight / 8) + "px";
  resetButton.style.borderRadius = (start.clientHeight / 8) + "px";
}

// This function is called when the document is done loading.
function
onLoad(event)
{
  // Determine if the app is installed, and the platform it is running on.
  const ua = navigator.userAgent;
  const isIOS = ua.match(/iPhone|iPad|iPod/);
  const isAndroid = ua.match(/Android/);
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  const isInstalled = !!(standalone || (isIOS && !ua.match(/Safari/)));

  // If the app is not installed, and this is a platform on which it makes
  // sense to install it (mobile), enable the button to provide the relevant
  // instructions.
  if(!isInstalled)
  {
    if(isIOS)
    {
      document.querySelector("#ios_install").
        setAttribute("style", "display: unset");
    }
    else if(isAndroid)
    {
      document.querySelector("#android_install").
        setAttribute("style", "display: unset");
    }
  }

  // Add the click handlers for the various buttons.
  addEvent(document.querySelector("#btn_about"), "click", showAbout);
  addEvent(document.querySelector("#btn_start"), "click", start);
  addEvent(document.querySelector("#btn_reset"), "click", reset);
  addEvent(document.querySelector("#btn_license"), "click", showLicense);
  addEvent(document.querySelector("#btn_ios"), "click", showIOS);
  addEvent(document.querySelector("#btn_android"), "click", showAndroid);

  // See if the user agent support a service worker.
  if("serviceWorker" in navigator)
  {
    // Only register a service worker if not being served from localhost (in
    // other words, development).
    if((window.location.hostname !== "localhost") &&
       (window.location.hostname !== "[::1]") && 
       !window.location.hostname.
          match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/))
    {
      // Register the service worker.
      navigator.serviceWorker
        .register("sw.js")
        .then(res => { })
        .catch(err => console.log("service worker not registered", err));
    }
  }

  // Perform a manual resize and render to ensure the the initial display is
  // correct.
  onResize();
  render();
}

// Generate iOS splash screens from the favicon.
iosPWASplash("favicon.webp", "#000000");

// Set the handlers for various window events.
addEvent(window, "focus", onFocus);
addEvent(window, "load", onLoad);
addEvent(window, "resize", onResize);