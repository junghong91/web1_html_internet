var http = require('http');
var fs = require('fs');     // nodejs module 중에서 filesystem module을 호출한다 
var url = require('url'); // 'url' module을 사용할 것 url 이라는 변수로 사용할 것
var qs = require('querystring'); 
var template = require('./lib/template.js');
var path = require('path');
var sanitizeHTML = require('sanitize-html'); // node_modules 에서 sanitize-html을 찾는다 

// // Refactoring
// var template = {
//     HTML: function(title, list, body, control) {
//         return `
//         <!doctype html>
//         <html>
//         <head>
//         <title>WEB1 - ${title}</title>
//         <meta charset="utf-8">
//         </head>
//         <body>
//         <h1><a href="/">WEB</a></h1>
//         ${list}
//         ${control}
//         ${body}
//         </body>
//         </html>
//         `
//     }, list: function(filelist) { // filelist 는 data directory 의 file list
//         var list = `<ol>`;
//         var i = 0; 
//         while(i < filelist.length) {
//             list = list + `<li><a href="/?id=${filelist[i]}">${filelist[i]}</a></li>`;
//             i = i + 1;
//         }
//         list = list + `</ol>`;
//         return list;
//     }
// }

// app 변수에는 http.Server 라는 객체가 리턴값으로 들어간다
var app = http.createServer(function(request,response){ // request: 요청할때 web browser가 보낸 정보, response: 응답할때 우리가 web browser에 전송할 정보들
    var _url = request.url;
    var queryData = url.parse(_url, true).query;
    var pathname = url.parse(_url, true).pathname;
    if(pathname === '/') { // 홈으로 갔는지 ...
        if(queryData.id === undefined) { // queryData.id === undefined, query string이 없을 경우. (메인화면, WEB 클릭할 경우)
            fs.readdir('./data', function(error, filelist) { // data directory 에서 
                var title = 'Welcome';
                var description = 'Hello, Node.js';
                /* 
                var list = templateList(filelist);
                var template = templateHTML(title, list, 
                    `<h2>${title}</h2><p>${description}</p>`,
                    '<a href="/create">create</a>'  // home 에는 update 버튼이 필요없기 때문에 control 인자에서 제외
                );
                response.writeHead(200);
                response.end(template); // 화면 출력 부분
                */
                var list = template.list(filelist);
                var HTML = template.HTML(title, list, 
                    `<h2>${title}</h2><p>${description}</p>`,
                    '<a href="/create">create</a>'  // home 에는 update 버튼이 필요없기 때문에 control 인자에서 제외
                );
                response.writeHead(200);
                response.end(HTML); // 화면 출력 부분
            })            
        } else { // query string 이 존재할 경우. (id 가 여러가지 리스트일 경우)
            fs.readdir('./data', function(error, filelist) { // data directory 에서 
                var filteredId = path.parse(queryData.id).base;  // 보안을 위해서 생성. query string을 통해서 파일을 찾을 수 없음
                fs.readFile(`data/${filteredId}`, 'utf8', function(err, description) {    // description은 본문.
                    var title = queryData.id;
                    var sanitizedTitle = sanitizeHTML(title);
                    var sanitizedDescription = sanitizeHTML(description, {
                        allowedTags:['h1']
                    });
                    var list = template.list(filelist);
                    var HTML = template.HTML(sanitizedTitle, list, 
                        `<h2>${sanitizedTitle}</h2><p>${sanitizedDescription}</p>`,
                        ` <a href="/create">create</a> 
                          <a href="/update?id=${sanitizedTitle}">update</a>
                          <form action="/delete_process" method="post">
                            <input type="hidden" name="id" value="${sanitizedTitle}">
                            <input type="submit" value="delete"> 
                          </form>
                        `
                    );
                    response.writeHead(200);
                    response.end(HTML); // 화면 출력 부분
                });
            });    
        }        
    } else if(pathname === '/create') { // create tag click 하면, 실행되는 부분, 
        fs.readdir('./data', function(error, filelist) { // data directory 에서 
            var title = 'WEB - Create';
            var list = template.list(filelist);
            // form tag : submit button 클릭하면, action 속성에 있는 server로 query string의 형태로 data 전송하는 html의 기능.        
            var HTML = template.HTML(title, list, `
                <form action="/create_process" method="post">
                    <p><input type="text" name="title" placeholder="title"></P>
                    <p>
                        <textarea name="description" placeholder="description"></textarea>
                    </p>
                    <p>
                        <input type="submit">
                    </p>
                </form>
            `, ''); // 버튼은 없지만 ''(공백문자) 로 함수의 인자는 전달한다.
            response.writeHead(200);
            response.end(HTML); // 화면 출력 부분
        })  
    } else if(pathname ==='/create_process') { // submit button를 클릭했을경우, form tag의 action 속서의 값의 pathname
        var body='';
        request.on('data', function(data) {  // post 방식으로 전송되는 data를 나눠서 받음. 
            body = body + data;
        });
        request.on('end', function() { // data가 모두 전송되면, 이 함수가 실행된다.
            var post = qs.parse(body);
            // console.log(post)     // {title: 'nodejs', description: 'nodejs is...'}   리스트 형태
            var title = post.title;
            var description = post.description;
            fs.writeFile(`data/${title}`, description, 'utf8', function(err) { // 파일을 생성하는 방법 (writeFile() 을 사용할 수 있다)
                response.writeHead(302, {location: `/?id=${title}`});
                response.end(); // 화면 출력 부분
            })
        });
    } else if(pathname === '/update') {
        fs.readdir('./data', function(error, filelist) {
            var filteredId = path.parse(queryData.id).base;  // 보안을 위해서 생성. query string을 통해서 파일을 찾을 수 
            fs.readFile(`data/${filteredId}`, 'utf8', function(err, description) {
                var title = queryData.id;
                var list = template.list(filelist);
                var HTML = template.HTML(title, list,
                    `
                    <form action="/update_process" method="post">
                        <input type="hidden" name="id" value="${title}">
                        <p><input type="text" name="title" placeholder="title" value="${title}"></P>
                        <p>
                            <textarea name="description" placeholder="description">${description}</textarea>
                        </p>
                        <p>
                             <input type="submit">
                        </p>
                    </form>
                    `,
                    `<a href="/create">create</a> <a href="/update?id=${title}">update</a>`
                );
                response.writeHead(200);
                response.end(HTML);
            });
        });
    } else if(pathname === '/update_process') {
        var body = '';
        request.on('data', function(data) {
            body = body + data;
        })
        request.on('end', function() {
            var post = qs.parse(body);
            var id = post.id;  // input type='hidden' 에서 받은 id 값, 기존 파일명
            var title = post.title;
            var description = post.description;
            fs.rename(`data/${id}`, `data/${title}`, function(error) {
                fs.writeFile(`data/${title}`, description, 'utf8', function(err) {
                    response.writeHead(302, {location: `/?id=${title}`});
                    response.end();
                })
            })            
        })
    } else if(pathname === '/delete_process') {
        var body = '';
        request.on('data', function(data) {
            body = body + data;
        })
        request.on('end', function() {
            var post = qs.parse(body);
            var id = post.id;  // input type='hidden' 에서 받은 id 값, 기존 파일명
            var filteredId = path.parse(id).base;  // 보안을 위해서 생성. query string을 통해서 파일을 찾을 수 
            fs.unlink(`data/${filteredId}`, function(error) {
                response.writeHead(302, {location: `/`}); // delete 이후에 home 화면으로 간다
                response.end(); // 화면 출력 부분
            })
        })
    } else {
        response.writeHead(404);
        response.end('Not found'); // 화면 출력 부분
    }
});
app.listen(3300); // 요청에 응답할 수 있도록 http 서버를 구동시키는 API