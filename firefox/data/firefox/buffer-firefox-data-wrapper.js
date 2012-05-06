var DataWrapper = function () {
    var config = {};
    config.endpoint = {
        http: 'http://static.bufferapp.com/images/extensions/',
        https: 'https://d389zggrogs7qo.cloudfront.net/images/extensions/',
    }
    return function (file) {
        file = file.replace(/data\//i, '');
        return (document.location.protocol === "http:" ? config.endpoint.http : config.endpoint.https) + file;
    };
};

if( ! xt ) var xt = {};
xt.data = {
    get: DataWrapper()
};