/** @param {NS} ns */
export async function main(ns) {
  // seems to be a function that opens the dev menu, but in reality does
  // a rick-roll.
  // ns.openDevMenu()

  // real dev menu script
	const boxes = Array.from(eval("document").querySelectorAll("[class*=MuiBox-root]"));
	const boxProps = boxes.map(box => Object.entries(box)[1][1].children.props);
	const props = boxProps.find(el => el?.player);
	eval("window")['PROPS'] = props
	props.router.toDevMenu();
}
