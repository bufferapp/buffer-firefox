/**
 * Currently all static files referenced in a firefox extension must be added
 * to the images/extensions folder in the buffer-web repo.
 * In the future, possibly refactor this so we can pass the proper file url
 * as in: http://stackoverflow.com/questions/11551467/how-to-reference-a-file-in-the-data-directory-of-a-firefox-extension
 */

var DataWrapper = function () {
    var config = {};
    config.endpoint = {
        http: 'http://static.bufferapp.com/images/extensions/',
        https: 'https://d389zggrogs7qo.cloudfront.net/images/extensions/',
    }
    return function (file) {
        file = file.replace(/data\/shared\//i, '');
        return (document.location.protocol === "http:" ? config.endpoint.http : config.endpoint.https) + file;
    };
};

if( ! xt ) var xt = {};
xt.data = {
    get: DataWrapper()
};