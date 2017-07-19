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

# This is the URL that keeps the stream open.
@app.route('/stream')
def stream():
    return flask.Response(event_stream(),
                          mimetype="text/event-stream")

# Page for setting up the game
@app.route('/')
def home():
    return flask.render_template('game-setup.html')

# When we receive a score for the table, publish it to the channel
# so anybody listening can hear.
@app.route("/score", methods=["GET", "POST"])
def score():
    if flask.request.method == "POST":
        player = flask.request.form['p']
        print(player)
        red.publish('scores', '%s' % player)
        return flask.Response(status=204)
    elif flask.request.method == "GET":
        return flask.Response(status=204)

@app.route('/current-game')
def current():
    return flask.render_template('current-game.html')



if __name__ == '__main__':
    app.debug = True
    app.run()
