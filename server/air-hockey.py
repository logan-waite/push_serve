import datetime
import flask
import redis

app = flask.Flask(__name__)
app.secret_key = "asdf"
red = redis.StrictRedis()

# This keeps track of what is happening in the database.
# pubsub.listen keeps track of any changes and then returns them
def event_stream():
    pubsub = red.pubsub()
    pubsub.subscribe("scores")
    # TODO: handle client disconnection
    for score in pubsub.listen():
        print (score)
        yield "data: %s\n\n" % score['data']

# Update scores
@app.route("/score", methods=["GET", "POST"])
def score():
    if flask.request.method == "POST":
        player = flask.request.form['p']
        red.publish('scores', '%s' % player)
        return flask.Response(status=204)
    elif flask.request.method == "GET":
        return flask.Response(status=204)

@app.route('/stream')
def stream():
    return flask.Response(event_stream(),
                          mimetype="text/event-stream")

if __name__ == '__main__':
    app.debug = True
    app.run()

@app.route('/')
def home():
    return """
        <!doctype html>
        <title>air-hockey</title>
        <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>
        <style>body { max-width: 500px; margin: auto; padding: 1em; background: black; color: #fff; font: 16px/1.6 menlo, monospace; }</style>
        <p><b>Game</b></p>
        <p>Message: <input id="in" /></p>
        <pre id="out"></pre>
        <script>
            function sse() {
                var source = new EventSource('/stream');
                var out = document.getElementById('out');
                source.onmessage = function(e) {
                    // XSS in chat is fun
                    out.innerHTML =  e.data + '\\n' + out.innerHTML;
                };
            }
            $('#in').keyup(function(e){
                if (e.keyCode == 13) {
                    $.post('/score', {'p': $(this).val()});
                    $(this).val('');
                }
            });
            sse();
        </script>
    """
