/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function reconcileListener(event, listener, enabled) {
    event.removeListener(listener);
    if (enabled) {
        event.addListener(listener);
    }
}

export function clearRuntimeState({ records, controller, navigation, topLevelUrls }) {
    records.clear();
    controller.requests.clear();
    navigation.clear();
    topLevelUrls.clear();
}
