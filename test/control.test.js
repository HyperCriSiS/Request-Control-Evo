import { jest } from "@jest/globals";

import { createRule } from "../src/main/api";
import { RequestController } from "../src/main/control";

let controller;
let request;
let blockRule;
let secureRule;
let whitelistRule;
let logRule;
let filterRule;
let redirectRule;
let filterParamsRule;
let mockNotify;
let mockUpdateTab;

beforeEach(() => {
    mockNotify = jest.fn();
    mockUpdateTab = jest.fn();
    controller = new RequestController(mockNotify, mockUpdateTab);
    request = { requestId: 0, url: "http://foo.com/click?p=240631&a=2314955&g=21407340&url=http%3A%2F%2Fbar.com%2F" };
    blockRule = createRule({ action: "block" });
    secureRule = createRule({ action: "secure" });
    whitelistRule = createRule({ action: "whitelist" });
    logRule = createRule({ action: "whitelist", log: true });
    filterRule = createRule({ action: "filter" });
    redirectRule = createRule({
        action: "redirect",
        redirectUrl: "https://redirect.url/",
    });
    filterParamsRule = createRule({
        action: "filter",
        skipRedirectionFilter: true,
        paramsFilter: {
            values: ["utm_*", "/./"],
        },
    });
});

afterEach(() => {
    expect(controller.requests.size).toBe(0);
});

describe("Resolving non-marked requests", () => {
    afterEach(() => {
        expect(mockNotify.mock.calls.length).toBe(0);
        expect(mockUpdateTab.mock.calls.length).toBe(0);
    });

    test("Resolve non-marked request", () => {
        const resolve = controller.resolve(request);
        expect(resolve).toBeFalsy();
    });

    test("Resolve marked request after clear", () => {
        controller.mark(request, blockRule);
        expect(controller.requests.size).toBe(1);
        controller.requests.clear();
        const resolve = controller.resolve(request);
        expect(resolve).toBeFalsy();
    });
});

test("Rule creation fails", () => {
    expect(() => {
        createRule("no-action");
    }).toThrow(Error);
});

describe("user is not notified", () => {
    afterEach(() => {
        expect(mockNotify.mock.calls.length).toBe(0);
    });

    test("when request is whitelisted", () => {
        controller.mark(request, filterRule);
        controller.mark(request, whitelistRule);
        controller.mark(request, blockRule);
        controller.mark(request, redirectRule);
        controller.mark(request, secureRule);
        const resolve = controller.resolve(request);
        expect(resolve).toBeFalsy();
    });

    test("when request is filtered and rule is not applied", () => {
        request = { requestId: 0, url: "http://bar.com/" };
        controller.mark(request, filterRule);
        const resolve = controller.resolve(request);
        expect(resolve).toBeFalsy();
    });

    test("when multiple whitelist rules are applied to single request", () => {
        controller.mark(request, createRule({ action: "whitelist" }));
        controller.mark(request, createRule({ action: "whitelist" }));
        expect(controller.requests.size).toBe(1);
        const resolve = controller.resolve(request);
        expect(resolve).toBeFalsy();
    });
});

describe("user is notified", () => {
    afterEach(() => {
        expect(mockNotify.mock.calls.length).toBe(1);
    });

    test("Request blocked", () => {
        controller.mark(request, secureRule);
        controller.mark(request, filterRule);
        controller.mark(request, blockRule);
        const resolve = controller.resolve(request);
        expect(resolve).toEqual({ cancel: true });
        expect(mockNotify.mock.calls[0][1]).toEqual({ action: "block", rule: blockRule });
    });

    test("Request redirected", () => {
        controller.mark(request, filterRule);
        controller.mark(request, secureRule);
        controller.mark(request, redirectRule);
        const resolve = controller.resolve(request);
        expect(resolve).toEqual({ redirectUrl: "https://redirect.url/" });
        expect(mockNotify.mock.calls[0][1]).toEqual({ action: "redirect", rule: redirectRule });
    });

    test("Request upgraded to secure", () => {
        controller.mark(request, filterRule);
        controller.mark(request, secureRule);
        const resolve = controller.resolve(request);
        expect(resolve).toEqual({ redirectUrl: "https://foo.com/click?p=240631&a=2314955&g=21407340&url=http%3A%2F%2Fbar.com%2F" });
        expect(mockNotify.mock.calls[0][1]).toEqual({ action: "secure", rule: secureRule });
    });

    test("Request filtered", () => {
        controller.mark(request, filterParamsRule);
        const resolve = controller.resolve(request);
        expect(resolve).toEqual({ redirectUrl: "http://foo.com/click" });
        expect(mockNotify.mock.calls[0][1]).toEqual({ action: "filter", rule: filterParamsRule });
    });

    test("Request logged", () => {
        controller.mark(request, logRule);
        const resolve = controller.resolve(request);
        expect(resolve).toBeFalsy();
        expect(mockNotify.mock.calls[0][1]).toEqual({ action: "whitelist", rule: logRule });
    });
});
