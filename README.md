# Batcher for Bitburner 2.1.0

The 'main' folder has my most recent.  I like to alias my commands when I start:

    alias scan="run tools/scan.js"
    alias servers="run tools/servers.js"
    alias hgw="run tools/batcher-hgw.js"
    alias ka="run tools/kill-all.js"

Commands:

**tools/scan.js**

Scans the network to find all servers and hack them if possible, and shows them in decreasing required hacking skill.
I run this command a lot so I have it aliased as 'scan' since the built-in 'scan' command is so useless.

Options:

* `--connect <server>` - output command to connect to server that you can copy and paste to connect

**tools/servers.js**

Shows your purchased servers and costs to buy new servers, and allows you to buy and replace servers.
By default will show what you can afford and the two cheaper and two more expensive options with
the ram and cost to buy, and the command to use.

Options:

* `all` - show all options, not just the 5 around your proice point
* `delete <name>` - delete server wth the given name
* `buy <name> <gb>` - buy server using name `<name>` with the requested ram
* `buy <name> auto` - buy the largest server you can afford with the given name
* `

