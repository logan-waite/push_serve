import datetime
import flask
import redis
import sqlite3
import collections
from operator import itemgetter

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
        yield "data: %s\n\n" % score['data']

# This is the URL that keeps the stream open.
@app.route('/stream')
def stream():
    return flask.Response(event_stream(),
                          mimetype="text/event-stream")

# Page for setting up the game
# This needs a list of players
@app.route('/')
def home():
    cur.execute("SELECT player_id, name FROM Players")
    db_players = cur.fetchall()
    players = collections.OrderedDict(db_players)
    return flask.render_template('game-setup.html', players=players)

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
        pubsub.unsubscribe("scores")
        # make sure if the match is a guest match, we don't save it
        if not flask.request.form.get('guest'):
            addMatch(flask_request=flask.request)
        return flask.Response(status=200)

# Admin page for players and matches
@app.route('/admin')
def admin():
    # Get list of players
    cur.execute("SELECT player_id, name FROM Players")
    db_players = cur.fetchall()
    players = collections.OrderedDict(db_players)
    # Get list of matches
    cur.execute("""SELECT m.match_id, p1.name AS p1_name, p2.name AS p2_name, m.p1_score, m.p2_score
                    FROM Matches m
                    JOIN Players p1 ON p1.player_id = m.p1_id
                    JOIN Players p2 ON p2.player_id = m.p2_id""")
    db_matches = cur.fetchall();
    matches = {}
    for match in db_matches:
        matches[match[0]] = [(match[1], match[3]), (match[2], match[4])]
    matches = collections.OrderedDict(reversed(list(matches.items())))
    return flask.render_template('admin.html', players=players, matches=matches)

# Call to add a player. All that's needed is name
@app.route('/admin/add-player', methods=["PUT"])
def addPlayer():
    name = flask.request.form["name"]
    cur.execute('INSERT OR IGNORE INTO Players (name, ranking) VALUES ( ?, NULL )', ( name, ) )
    conn.commit()
    return flask.Response(status=200)

# Call to add a match, both manually and at the end of a game
@app.route("/admin/add-match", methods=["PUT"])
def addMatch(flask_request=None):

    if flask.request.method == "PUT":
        flask_request = flask.request
    p1_id = flask_request.form.get("p1_id")
    p2_id = flask_request.form.get("p2_id")
    p1_score = flask_request.form.get("p1_score")
    p2_score = flask_request.form.get("p2_score")

    cur.execute(""" SELECT player_id, wins
                    FROM Players
                    WHERE ? = player_id
                    OR ? = player_id """,
                    ( p1_id, p2_id, ))
    result = cur.fetchall()
    p1 = { "id": result[0][0], "wins": int(result[0][1] if result[0][1] is not None else 0), "score": int(p1_score) }
    p2 = { "id": result[1][0], "wins": int(result[1][1] if result[1][1] is not None else 0), "score": int(p2_score) }

    #-----------------------#
    # Algorithm for ranking #
    #-----------------------#

    if p1["score"] > p2["score"]:
        # Add the most recent win (that we haven't saved yet)
        p1["wins"] += 1
        # Weights for the current match
        # These will get saved into the Matches table
        match_weights = getWinLoseWeights(p1["score"], p2["score"], p1["wins"], p2["wins"])
        weights = {"p1": match_weights[0], "p2": match_weights[1]}
    else:
        # Add the most recent win (that we haven't saved yet)
        p2["wins"] += 1
        # Weights for the current match
        # These will get saved into the Matches table
        match_weights = getWinLoseWeights(p2["score"], p1["score"], p2["wins"], p1["wins"])
        weights = {"p1": match_weights[1], "p2": match_weights[0]}

    # Save the match now so we can use it to get the player weights
    cur.execute("""INSERT OR IGNORE INTO Matches
                    (p1_id, p2_id, p1_score, p2_score, p1_weight, p2_weight)
                    VALUES ( ?, ?, ?, ?, ?, ? )""",
                     ( p1_id, p2_id, p1_score, p2_score, weights["p1"], weights["p2"]) )
    conn.commit()

    # Player weights are saved to the player
    getPlayerWeight(p1)
    getPlayerWeight(p2)

    if flask.request.method == "PUT":
        return flask.Response(status=200)
    return True

def getWinLoseWeights(w_score, l_score, w_wins, l_wins):
    # Need winner score, loser score, winner wins, loser wins
    win_diff = 0
    score_diff = w_score - l_score

    if w_wins < l_wins:
        win_diff = l_wins - w_wins

    win_avg = w_score + score_diff + win_diff

    denom = win_avg + l_score;
    win_weight = win_avg / denom
    lose_weight = l_score / denom

    return [win_weight, lose_weight]

def getPlayerWeight(player):
    p_id = player["id"]
    # Get all the matches this player was in
    cur.execute(""" SELECT p1_id, p2_id, p1_weight, p2_weight
                    FROM Matches
                    WHERE p1_id = ?
                    OR p2_id = ?""",
                    ( p_id, p_id, ))
    db_matches = cur.fetchall()
    weights = []
    # Pull out the player's weights
    for match in db_matches:
        if match[0] == p_id:
            weights.append(int(match[2]) if match[2] is not None else 0)
        elif match[1] == p_id:
            weights.append(int(match[3]) if match[3] is not None else 0)
    # Find the average
    p_weight =  sum(weights)/len(weights)

    print("p_weight: " + str(p_weight))
    print("p wins: " + str(player["wins"]))

    cur.execute(""" UPDATE Players
                    SET weight = ?, wins = ?
                    WHERE player_id = ? """,
                    ( p_weight, player["wins"], player["id"], ))
    conn.commit()

    return p_weight


if __name__ == '__main__':
    app.debug = True
    app.run()
