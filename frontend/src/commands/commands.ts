/* eslint-disable no-undef */

Office.onReady(() => {
    // Commands are registered when Office is ready
});

/**
 * Shows a notification when the add-in command is executed.
 * @param event - The event object from the ribbon command.
 */
function action(event: Office.AddinCommands.Event) {
    event.completed();
}

// Register the function with Office
Office.actions.associate("action", action);
