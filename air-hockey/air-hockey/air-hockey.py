import datetime
import flask
import redis
import sqlite3

# TODO: Save match results to a database
# TODO: Create leaderboard

# Get stuff set up
app = flask.Flask(__name__)
app.secret_key = "asdf"
red = redis.StrictRedis()
pubsub = red.pubsub()
# Get the cursor for the airhockey database
conn = sqlite3.connect("airhockey.sqlite")
conn.text_factory = str
cur = conn.cursor()

# This keeps track of what is happening with scoring.
# pubsub.listen keeps track of any changes and then returns them
def event_stream():
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
        red.publish('scores', '%s' % player)
        return flask.Response(status=204)
    elif flask.request.method == "GET":
        return flask.Response(status=204)

# Page for showing game progress. This is where updated channel info goes
@app.route('/current-game')
def current():
    return flask.render_template('current-game.html')

# This gets called at the end of the game to save the match
# also unsubscribes from redis.pubsub
@app.route('/end-game', methods=["POST"])
def end():
    if flask.request.method == "POST":
        # make sure if the match is a guest match, we don't save it
        pubsub.unsubscribe("scores")
        addMatch(flask.request)
        return flask.Response(status=200)

# Admin page for players and matches
@app.route('/admin')
def admin():
    return flask.render_template('admin.html')

# Call to add a player. All that's needed is name
@app.route('/admin/add-player', methods=["PUT"])
def addPlayer():
    print(flask.request.form)
    name = flask.request.form["name"]
    print(name)
    cur.execute('INSERT OR IGNORE INTO Players (name, ranking) VALUES ( ?, NULL )', ( name ) )
    conn.commit()
    return flask.Response(status=200)

# Call to add a match, both manually and at the end of a game
@app.route("/admin/add-match", methods=["PUT"])
def addMatch(flask_request):
    if flask.request.method == "PUT":
        flask_request = flask.request
    p1_id = flask_request.form["p1_id"]
    p2_id = flask_request.form["p2_id"]
    p1_score = flask_request.form["p1_score"]
    p2_score = flask_request.form["p2_score"]

    cur.execute("""INSERT OR IGNORE INTO Matches
                    (p1_id, p2_id, p1_score, p2_score)
                    VALUES ( ?, ?, ?, ? )""",
                     ( p1_id, p2_id, p1_score, p2_score ) )
    conn.commit()
    if flask.request.method == "POST":
        return flask.Reponse(status=200)
    return True


if __name__ == '__main__':
    app.debug = True
    app.run()
